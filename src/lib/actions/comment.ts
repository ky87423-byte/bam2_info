"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PointAction as DbPointAction } from "@/generated/prisma/enums";

// ── 행운 포인트 정책 (코드 상수, 추후 admin 페이지에서 조정 예정) ──────────
const LUCKY = {
  PROBABILITY: 0.10, // 10%
  MIN_POINTS:  10,
  MAX_POINTS:  100,
} as const;

// ── 입력 타입 ─────────────────────────────────────────────────────────────
export interface CreateCommentInput {
  targetType: string;        // 'promotion' | 'free' | 'notice' | ...
  targetId:   number;
  content:    string;
  parentId?:  number | null; // 답글일 때 부모 댓글 id
}

export type CreateCommentResult =
  | { ok: true;  isLuckyWin: boolean; luckyAmount: number; commentId: number }
  | { ok: false; error: string };

// ── 댓글 생성 + 행운 포인트 (트랜잭션) ─────────────────────────────────────

export async function createCommentAction(input: CreateCommentInput): Promise<CreateCommentResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };

  const authorId = parseInt(session.user.id, 10);
  if (isNaN(authorId)) return { ok: false, error: "유저 정보가 올바르지 않습니다." };

  const content = (input.content ?? "").trim();
  if (!content)             return { ok: false, error: "댓글 내용을 입력하세요." };
  if (content.length > 2000) return { ok: false, error: "댓글은 2000자 이내로 작성해주세요." };
  if (!input.targetType || !/^[a-z][a-z0-9_-]{0,30}$/.test(input.targetType)) {
    return { ok: false, error: "잘못된 게시판 타입입니다." };
  }
  if (!Number.isInteger(input.targetId) || input.targetId <= 0) {
    return { ok: false, error: "잘못된 게시글 id 입니다." };
  }

  // ── 2단계 깊이 제한 검사 ─────────────────────────────────────────────
  let parentId: number | null = null;
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { id: true, parentId: true, targetType: true, targetId: true, deletedAt: true },
    });
    if (!parent || parent.deletedAt) return { ok: false, error: "부모 댓글을 찾을 수 없습니다." };
    if (parent.targetType !== input.targetType || parent.targetId !== input.targetId) {
      return { ok: false, error: "부모 댓글이 다른 게시글에 속합니다." };
    }
    if (parent.parentId !== null) {
      return { ok: false, error: "답글에는 답글을 달 수 없습니다 (2단계 제한)." };
    }
    parentId = parent.id;
  }

  // ── 행운 포인트 추첨 ──────────────────────────────────────────────────
  const isLuckyWin = Math.random() < LUCKY.PROBABILITY;
  const luckyAmount = isLuckyWin
    ? Math.floor(Math.random() * (LUCKY.MAX_POINTS - LUCKY.MIN_POINTS + 1)) + LUCKY.MIN_POINTS
    : 0;

  // ── 트랜잭션: 댓글 생성 + (당첨 시) User.points + PointLog ────────────
  try {
    const result = await prisma.$transaction(async (tx) => {
      const author = await tx.user.findUnique({ where: { id: authorId }, select: { username: true, points: true } });
      if (!author) throw new Error("USER_NOT_FOUND");

      const comment = await tx.comment.create({
        data: {
          targetType:  input.targetType,
          targetId:    input.targetId,
          authorId,
          parentId,
          content,
          isLuckyWin,
          luckyAmount: isLuckyWin ? luckyAmount : null,
        },
      });

      if (isLuckyWin && luckyAmount > 0) {
        const newBalance = author.points + luckyAmount;
        await tx.user.update({ where: { id: authorId }, data: { points: newBalance } });
        await tx.pointLog.create({
          data: {
            userId:   authorId,
            username: author.username,
            action:   DbPointAction.LUCKY,
            amount:   luckyAmount,
            balance:  newBalance,
            memo:     `🎉 댓글 행운 당첨 (${input.targetType} #${input.targetId})`,
          },
        });
      }

      return { commentId: comment.id };
    });

    revalidatePath(`/posts/${input.targetId}`);
    revalidatePath(`/${input.targetType}/${input.targetId}`);
    return { ok: true, isLuckyWin, luckyAmount, commentId: result.commentId };
  } catch (e) {
    if (e instanceof Error && e.message === "USER_NOT_FOUND") {
      return { ok: false, error: "회원 정보를 찾을 수 없습니다." };
    }
    console.error("[createCommentAction]", e);
    return { ok: false, error: "댓글 저장 중 오류가 발생했습니다." };
  }
}

// ── 댓글 삭제 (soft delete) ────────────────────────────────────────────────

export async function deleteCommentAction(commentId: number): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id, 10);

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, targetType: true, targetId: true, deletedAt: true },
  });
  if (!comment || comment.deletedAt) return { ok: false, error: "댓글이 존재하지 않습니다." };

  // 작성자 본인 또는 admin만 삭제 가능
  const isAuthor = comment.authorId === userId;
  const isAdmin  = session.user.role === "admin";
  if (!isAuthor && !isAdmin) return { ok: false, error: "삭제 권한이 없습니다." };

  await prisma.comment.update({
    where: { id: commentId },
    data:  { deletedAt: new Date() },
  });

  revalidatePath(`/posts/${comment.targetId}`);
  revalidatePath(`/${comment.targetType}/${comment.targetId}`);
  return { ok: true };
}

// ── 댓글 조회 (CommentSection 서버 컴포넌트에서 사용) ──────────────────────

export interface CommentTreeNode {
  id: number;
  authorId: number;
  authorUsername: string;
  authorNickname: string;
  authorRole: string;
  content: string;
  isLuckyWin: boolean;
  luckyAmount: number | null;
  createdAt: string;
  deletedAt: string | null;
  replies: CommentTreeNode[];
}

export async function getCommentsForTarget(targetType: string, targetId: number): Promise<CommentTreeNode[]> {
  const rows = await prisma.comment.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, nickname: true, role: true } },
    },
  });

  // parent / replies 트리 구조로 변환 (2단계 깊이 보장)
  const tops: CommentTreeNode[] = [];
  const map  = new Map<number, CommentTreeNode>();

  for (const r of rows) {
    if (r.parentId !== null) continue; // 1차 패스: top-level만
    const node: CommentTreeNode = {
      id:             r.id,
      authorId:       r.authorId,
      authorUsername: r.author.username,
      authorNickname: r.author.nickname,
      authorRole:     String(r.author.role).toLowerCase(),
      content:        r.deletedAt ? "(삭제된 댓글입니다)" : r.content,
      isLuckyWin:     r.isLuckyWin,
      luckyAmount:    r.luckyAmount,
      createdAt:      r.createdAt.toISOString(),
      deletedAt:      r.deletedAt ? r.deletedAt.toISOString() : null,
      replies:        [],
    };
    tops.push(node);
    map.set(r.id, node);
  }
  for (const r of rows) {
    if (r.parentId === null) continue;
    const parent = map.get(r.parentId);
    if (!parent) continue; // 부모가 없으면 무시 (cascade로 함께 삭제됐을 가능성)
    parent.replies.push({
      id:             r.id,
      authorId:       r.authorId,
      authorUsername: r.author.username,
      authorNickname: r.author.nickname,
      authorRole:     String(r.author.role).toLowerCase(),
      content:        r.deletedAt ? "(삭제된 댓글입니다)" : r.content,
      isLuckyWin:     r.isLuckyWin,
      luckyAmount:    r.luckyAmount,
      createdAt:      r.createdAt.toISOString(),
      deletedAt:      r.deletedAt ? r.deletedAt.toISOString() : null,
      replies:        [],
    });
  }

  return tops;
}
