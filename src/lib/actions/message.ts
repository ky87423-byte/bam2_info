"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ── 입력 타입 ─────────────────────────────────────────────────────────────
export interface SendMessageInput {
  receiverId: number;
  content:    string;
}

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// 발송 결과 — 가상 수신자(스크랩 업소) 우회 시 isInquiry=true 로 클라이언트 알림
export interface SendMessageResult {
  id:         number;
  isInquiry:  boolean;       // true = AdminInquiry 로 우회 저장됨
  shopId?:    number;        // 우회 시 어느 업소로 향한 문의인지
  shopName?:  string;
}

// ── 쪽지 발송 (가상 수신자 자동 우회) ────────────────────────────────────
export async function sendMessageAction(input: SendMessageInput): Promise<ActionResult<SendMessageResult>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  const senderId = parseInt(session.user.id, 10);
  if (isNaN(senderId)) return { ok: false, error: "유저 정보 오류." };

  const content = (input.content ?? "").trim();
  if (!content)              return { ok: false, error: "내용을 입력하세요." };
  if (content.length > 2000) return { ok: false, error: "쪽지는 2000자 이내로 작성해주세요." };
  if (input.receiverId === senderId) return { ok: false, error: "본인에게 쪽지를 보낼 수 없습니다." };
  if (!Number.isInteger(input.receiverId) || input.receiverId <= 0) {
    return { ok: false, error: "받는 사람 정보가 올바르지 않습니다." };
  }

  const receiver = await prisma.user.findUnique({
    where: { id: input.receiverId },
    select: { id: true, status: true, isVirtual: true },
  });
  if (!receiver) return { ok: false, error: "받는 사람을 찾을 수 없습니다." };

  // ── 우회 분기: 수신자가 가상 계정이면 AdminInquiry 로 저장 ──
  if (receiver.isVirtual) {
    const shop = await prisma.shop.findUnique({
      where:  { virtualUserId: receiver.id },
      select: { id: true, company: true, ownerId: true },
    });
    if (!shop) {
      return { ok: false, error: "가상 계정과 연결된 업소를 찾을 수 없습니다." };
    }

    // 만약 클레임이 이미 승인되어 owner가 있다면, owner에게 직접 쪽지로 전달
    if (shop.ownerId && shop.ownerId !== senderId) {
      const direct = await prisma.message.create({
        data: { senderId, receiverId: shop.ownerId, content },
        select: { id: true },
      });
      revalidatePath("/mypage/messages");
      return { ok: true, data: { id: direct.id, isInquiry: false, shopId: shop.id, shopName: shop.company } };
    }

    // 아직 ownerless → 관리자 인콰이어리로 우회
    const inquiry = await prisma.adminInquiry.create({
      data: {
        senderId,
        shopId:        shop.id,
        virtualUserId: receiver.id,
        content,
      },
      select: { id: true },
    });
    revalidatePath("/admin/inquiries");
    return { ok: true, data: { id: inquiry.id, isInquiry: true, shopId: shop.id, shopName: shop.company } };
  }

  // ── 일반 경로: 실 회원 → 회원 ──
  const msg = await prisma.message.create({
    data: { senderId, receiverId: input.receiverId, content },
    select: { id: true },
  });

  revalidatePath("/mypage/messages");
  return { ok: true, data: { id: msg.id, isInquiry: false } };
}

// ── 쪽지 읽음 처리 ─────────────────────────────────────────────────────────
export async function markMessageReadAction(messageId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id, 10);

  // updateMany로 안전하게 (수신자 본인만, 이미 읽힌 건 무시)
  await prisma.message.updateMany({
    where: { id: messageId, receiverId: userId, isRead: false },
    data:  { isRead: true },
  });

  revalidatePath("/mypage/messages");
  return { ok: true };
}

// ── 쪽지 삭제 (작성자/수신자/admin만) ─────────────────────────────────────
export async function deleteMessageAction(messageId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  const userId  = parseInt(session.user.id, 10);
  const isAdmin = session.user.role === "admin";

  const msg = await prisma.message.findUnique({
    where:  { id: messageId },
    select: { senderId: true, receiverId: true },
  });
  if (!msg) return { ok: false, error: "쪽지를 찾을 수 없습니다." };

  const isOwner = msg.senderId === userId || msg.receiverId === userId;
  if (!isOwner && !isAdmin) return { ok: false, error: "삭제 권한이 없습니다." };

  await prisma.message.delete({ where: { id: messageId } });
  revalidatePath("/mypage/messages");
  revalidatePath("/admin/messages");
  return { ok: true };
}

// ── 관리자 직접 쪽지 발송 ─────────────────────────────────────────────────
// (sendMessageAction과 동일 로직 + admin 권한 체크 추가)
export async function adminSendMessageAction(input: SendMessageInput): Promise<ActionResult<{ id: number }>> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const result = await sendMessageAction(input);
  revalidatePath("/admin/messages");
  return result;
}

// ── 조회 함수 ─────────────────────────────────────────────────────────────

export async function getMyMessages(folder: "inbox" | "sent" = "inbox") {
  const session = await auth();
  if (!session?.user?.id) return [];
  const userId = parseInt(session.user.id, 10);

  const where = folder === "inbox" ? { receiverId: userId } : { senderId: userId };
  const rows = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sender:   { select: { id: true, nickname: true, role: true } },
      receiver: { select: { id: true, nickname: true, role: true } },
    },
  });
  return rows;
}

export async function getAdminMessages(opts: { q?: string; page?: number; pageSize?: number } = {}) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { rows: [], total: 0 };

  const { q = "", page = 1, pageSize = 30 } = opts;
  const where = q
    ? { content: { contains: q, mode: "insensitive" as const } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sender:   { select: { id: true, nickname: true, username: true, role: true } },
        receiver: { select: { id: true, nickname: true, username: true, role: true } },
      },
    }),
    prisma.message.count({ where }),
  ]);
  return { rows, total };
}
