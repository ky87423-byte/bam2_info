"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClaimStatus } from "@/generated/prisma/enums";

export type ClaimResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ── 클레임 신청 ─────────────────────────────────────────────────────────
export async function createClaimRequestAction(input: {
  shopId:       number;
  proofText:    string;
  contactPhone: string;
}): Promise<ClaimResult<{ id: number }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인 후 신청해 주세요." };
  const claimantId = parseInt(session.user.id, 10);
  if (isNaN(claimantId)) return { ok: false, error: "유저 정보 오류." };

  const proof = (input.proofText ?? "").trim();
  const phone = (input.contactPhone ?? "").trim();
  if (!proof || proof.length < 10) {
    return { ok: false, error: "증빙 내용을 10자 이상 입력해 주세요." };
  }
  if (proof.length > 1500) {
    return { ok: false, error: "증빙 내용은 1500자 이내로 작성해 주세요." };
  }
  if (!phone.match(/^[\d\s\-+()]{8,20}$/)) {
    return { ok: false, error: "연락 가능한 전화번호를 정확히 입력해 주세요." };
  }
  if (!Number.isInteger(input.shopId) || input.shopId <= 0) {
    return { ok: false, error: "잘못된 업소 id입니다." };
  }

  // 업소 존재 확인 + 이미 owner 있으면 차단
  const shop = await prisma.shop.findUnique({
    where:  { id: input.shopId },
    select: { id: true, ownerId: true },
  });
  if (!shop) return { ok: false, error: "업소를 찾을 수 없습니다." };
  if (shop.ownerId) {
    return { ok: false, error: "이 업소는 이미 다른 회원이 소유하고 있습니다." };
  }

  // 본인이 이미 PENDING 신청 중이면 중복 차단
  const existing = await prisma.claimRequest.findFirst({
    where:  { shopId: input.shopId, claimantId, status: ClaimStatus.PENDING },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "이미 검토 중인 신청이 있습니다." };
  }

  const created = await prisma.claimRequest.create({
    data: {
      shopId:       input.shopId,
      claimantId,
      proofText:    proof,
      contactPhone: phone,
    },
    select: { id: true },
  });

  revalidatePath("/admin/claims");
  return { ok: true, data: { id: created.id } };
}

// ── admin 승인 ─────────────────────────────────────────────────────────
export async function approveClaimAction(claimId: number, note: string = ""): Promise<ClaimResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  const claim = await prisma.claimRequest.findUnique({
    where:  { id: claimId },
    select: { id: true, shopId: true, claimantId: true, status: true },
  });
  if (!claim) return { ok: false, error: "신청을 찾을 수 없습니다." };
  if (claim.status !== ClaimStatus.PENDING) {
    return { ok: false, error: "이미 처리된 신청입니다." };
  }

  // 트랜잭션: 클레임 승인 + Shop.ownerId 설정 + 같은 업소 다른 PENDING 신청 자동 거절
  await prisma.$transaction(async (tx) => {
    await tx.claimRequest.update({
      where: { id: claim.id },
      data:  {
        status:     ClaimStatus.APPROVED,
        adminNote:  note,
        reviewedAt: new Date(),
      },
    });
    await tx.shop.update({
      where: { id: claim.shopId },
      data:  { ownerId: claim.claimantId },
    });
    // 같은 shop에 대한 다른 PENDING 신청을 모두 거절
    await tx.claimRequest.updateMany({
      where: { shopId: claim.shopId, status: ClaimStatus.PENDING },
      data:  {
        status:     ClaimStatus.REJECTED,
        adminNote:  "다른 신청자가 먼저 승인됨",
        reviewedAt: new Date(),
      },
    });
  });

  revalidatePath("/admin/claims");
  revalidatePath(`/shop/${claim.shopId}`);
  return { ok: true };
}

// ── admin 거절 ─────────────────────────────────────────────────────────
export async function rejectClaimAction(claimId: number, note: string = ""): Promise<ClaimResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  await prisma.claimRequest.updateMany({
    where: { id: claimId, status: ClaimStatus.PENDING },
    data:  {
      status:     ClaimStatus.REJECTED,
      adminNote:  note,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/claims");
  return { ok: true };
}
