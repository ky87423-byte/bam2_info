"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractIpFromHeaders } from "@/lib/api/events";
import { shouldCount } from "@/lib/viewTracker";

export type BoardPostResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ── 권한 체크 헬퍼 (카테고리별 정책) ──────────────────────────────────────
function canPostInCategory(role: string | undefined, category: string): boolean {
  if (category === "shop_only") return role === "shop" || role === "admin";
  // anonymous: 모든 로그인 사용자 (USER/SHOP/ADMIN)
  // 그 외: 모든 로그인 사용자 (default)
  return true;
}

// ── 카테고리별 base path 매핑 (revalidate / 리다이렉트 용) ────────────────
function basePath(category: string): string {
  if (category === "shop_only") return "/shop-community";
  if (category === "anonymous") return "/anonymous";
  return "/posts";   // 미래 확장
}

// ── 작성 ─────────────────────────────────────────────────────────────
export async function createBoardPostAction(input: {
  category: string;
  title:    string;
  content:  string;
}): Promise<BoardPostResult<{ id: number }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  const authorId = parseInt(session.user.id, 10);

  if (!canPostInCategory(session.user.role, input.category)) {
    return { ok: false, error: "해당 게시판에 글을 쓸 권한이 없습니다." };
  }

  const title   = (input.title ?? "").trim();
  const content = (input.content ?? "").trim();
  if (!title || title.length > 200)        return { ok: false, error: "제목은 1~200자 이내로 입력하세요." };
  if (!content || content.length > 20_000) return { ok: false, error: "내용은 1~20000자 이내로 입력하세요." };
  if (!/^[a-z][a-z0-9_]{0,30}$/.test(input.category)) {
    return { ok: false, error: "잘못된 카테고리입니다." };
  }

  const post = await prisma.boardPost.create({
    data: { category: input.category, title, content, authorId },
    select: { id: true },
  });

  revalidatePath(basePath(input.category));
  return { ok: true, data: { id: post.id } };
}

// ── 수정 ─────────────────────────────────────────────────────────────
export async function updateBoardPostAction(input: {
  id:      number;
  title:   string;
  content: string;
}): Promise<BoardPostResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id, 10);
  const isAdmin = session.user.role === "admin";

  const post = await prisma.boardPost.findUnique({
    where: { id: input.id },
    select: { authorId: true, category: true, deletedAt: true },
  });
  if (!post || post.deletedAt) return { ok: false, error: "게시글을 찾을 수 없습니다." };
  if (post.authorId !== userId && !isAdmin) return { ok: false, error: "수정 권한이 없습니다." };

  const title   = (input.title ?? "").trim();
  const content = (input.content ?? "").trim();
  if (!title || title.length > 200)        return { ok: false, error: "제목은 1~200자 이내로 입력하세요." };
  if (!content || content.length > 20_000) return { ok: false, error: "내용은 1~20000자 이내로 입력하세요." };

  await prisma.boardPost.update({ where: { id: input.id }, data: { title, content } });
  const base = basePath(post.category);
  revalidatePath(`${base}/${input.id}`);
  revalidatePath(base);
  return { ok: true };
}

// ── 삭제 (soft) ──────────────────────────────────────────────────────
export async function deleteBoardPostAction(id: number): Promise<BoardPostResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id, 10);
  const isAdmin = session.user.role === "admin";

  const post = await prisma.boardPost.findUnique({
    where: { id },
    select: { authorId: true, category: true, deletedAt: true },
  });
  if (!post || post.deletedAt) return { ok: false, error: "이미 삭제됐습니다." };
  if (post.authorId !== userId && !isAdmin) return { ok: false, error: "삭제 권한이 없습니다." };

  await prisma.boardPost.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath(basePath(post.category));
  return { ok: true };
}

// ── 조회 ─────────────────────────────────────────────────────────────
export async function getBoardPosts(category: string, page = 1, pageSize = 20) {
  const where = { category, deletedAt: null, isVisible: true };
  const [rows, total] = await Promise.all([
    prisma.boardPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, username: true, nickname: true, role: true } },
      },
    }),
    prisma.boardPost.count({ where }),
  ]);

  // Comment 테이블에서 게시글별 댓글 수 집계 (한 번의 쿼리, targetType=category)
  const ids = rows.map((r) => r.id);
  const commentCounts = ids.length === 0 ? [] : await prisma.comment.groupBy({
    by: ["targetId"],
    where: { targetType: category, targetId: { in: ids }, deletedAt: null },
    _count: { id: true },
  });
  const commentMap = new Map(commentCounts.map((c) => [c.targetId, c._count.id]));

  return {
    rows: rows.map((r) => ({ ...r, commentCount: commentMap.get(r.id) ?? 0 })),
    total,
  };
}

export async function getBoardPostById(id: number) {
  const post = await prisma.boardPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, nickname: true, role: true } },
    },
  });
  if (!post || post.deletedAt) return null;
  // 조회수 +1 — IP+post id 1시간 dedup. best-effort (실패해도 페이지 렌더 안 끊김)
  try {
    const reqHeaders = await headers();
    const ip = extractIpFromHeaders(reqHeaders);
    if (shouldCount(`board:${post.category}:${id}:${ip}`)) {
      prisma.boardPost.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    }
  } catch { /* headers() 호출 컨텍스트 외 — dedup 없이 +1 안 함 (안전) */ }
  return post;
}
