"use server";

import { revalidatePath } from "next/cache";
import {
  createCoupon, updateCoupon, deleteCoupon, claimCoupon, markCouponUsed, saveSettings,
  couponLabel, COUPON_AMOUNT_MIN, COUPON_AMOUNT_MAX,
  getCoupons, getUserById, getUserCouponById,
  type CouponType,
} from "@/lib/data";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function parseCouponForm(formData: FormData) {
  const shopIdRaw          = formData.get("shopId") as string;
  const ownerUserIdRaw     = formData.get("ownerUserId") as string;
  const maxIssueRaw        = formData.get("maxIssue") as string;
  const discountAmountRaw  = formData.get("discountAmount") as string;
  const couponTypeRaw      = (formData.get("couponType") as string) || "";

  const couponType: CouponType | undefined =
    couponTypeRaw === "ORIGINAL_PRICE" || couponTypeRaw === "FREE" || couponTypeRaw === "DISCOUNT"
      ? couponTypeRaw : undefined;

  let discountAmount: number | undefined =
    discountAmountRaw ? parseInt(discountAmountRaw, 10) : undefined;
  if (discountAmount !== undefined) {
    if (Number.isNaN(discountAmount) || discountAmount < 0) discountAmount = undefined;
  }
  // DISCOUNT 가 아니면 amount 무시
  if (couponType !== "DISCOUNT") discountAmount = undefined;

  // 표시용 라벨 자동 생성 (couponType 있으면 그걸 우선, 없으면 폼의 free-form 유지)
  const fallbackDiscount = (formData.get("discount") as string) ?? "";
  const discount = couponType
    ? couponLabel({ couponType, discountAmount, discount: fallbackDiscount })
    : fallbackDiscount;

  // 사진 — JSON.stringify 된 배열 형태 (ShopPostForm 패턴 재사용)
  let photos: string[] = [];
  try {
    const raw = formData.get("photos");
    if (typeof raw === "string" && raw) photos = JSON.parse(raw).slice(0, 30);
  } catch { /* ignore */ }
  const mainPhoto = (formData.get("mainPhoto") as string) || photos[0] || "";

  return {
    type:        (formData.get("type") as "coupon" | "event") || "coupon",
    title:       formData.get("title") as string,
    description: formData.get("description") as string,
    discount,
    couponType,
    discountAmount,
    shopId:      shopIdRaw ? parseInt(shopIdRaw, 10) : null,
    shopName:    formData.get("shopName") as string,
    validUntil:  formData.get("validUntil") as string,
    isActive:    formData.get("isActive") === "on",
    maxIssue:    maxIssueRaw ? parseInt(maxIssueRaw, 10) || 0 : 0,
    ownerUserId: ownerUserIdRaw ? parseInt(ownerUserIdRaw, 10) : null,
    area:        ((formData.get("area") as string) || "").trim(),
    bizType:     ((formData.get("bizType") as string) || "").trim(),
    photos,
    mainPhoto,
  };
}

function validateCouponInput(input: ReturnType<typeof parseCouponForm>): string | null {
  if (!input.title?.trim()) return "제목을 입력하세요.";
  if (input.couponType === "DISCOUNT") {
    const a = input.discountAmount ?? 0;
    if (a < COUPON_AMOUNT_MIN || a > COUPON_AMOUNT_MAX) {
      return `할인 금액은 ${COUPON_AMOUNT_MIN.toLocaleString()}원 ~ ${COUPON_AMOUNT_MAX.toLocaleString()}원 범위로 입력하세요.`;
    }
  }
  return null;
}

export async function actionSaveMenuVisibility(couponVisible: boolean, eventVisible: boolean) {
  saveSettings({ menuCouponVisible: couponVisible, menuEventVisible: eventVisible });
  revalidatePath("/", "layout");
  revalidatePath("/admin/coupons");
}

export async function actionCreateCoupon(formData: FormData) {
  const input = parseCouponForm(formData);
  const err = validateCouponInput(input);
  if (err) return { error: err };
  createCoupon(input);
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
  return { ok: true };
}

export async function actionUpdateCoupon(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  if (!id) return { error: "잘못된 요청입니다." };
  const input = parseCouponForm(formData);
  const err = validateCouponInput(input);
  if (err) return { error: err };
  updateCoupon(id, input);
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
  return { ok: true };
}

export async function actionToggleCouponActive(id: number, isActive: boolean) {
  updateCoupon(id, { isActive });
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
}

export async function actionDeleteCoupon(id: number) {
  deleteCoupon(id);
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
}

export async function actionClaimCoupon(
  couponId: number,
): Promise<{ ok?: boolean; error?: string; reservationCode?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id);
  const result = await claimCoupon(userId, couponId);
  if (!result.ok) return { error: result.error };

  // 알림 쪽지 발송 — sender = 쿠폰 ownerUserId(없으면 첫 admin)
  try {
    const coupon = getCoupons().find((c) => c.id === couponId);
    let senderId: number | null = coupon?.ownerUserId ?? null;
    if (!senderId) {
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      senderId = admin?.id ?? null;
    }
    if (senderId && senderId !== userId) {
      const codeLine = result.reservationCode ? `\n예약 코드: ${result.reservationCode}` : "";
      await prisma.message.create({
        data: {
          senderId,
          receiverId: userId,
          content: `쿠폰이 발급되었습니다. 내 쿠폰함에서 확인하세요.${codeLine}`,
        },
      });
      revalidatePath("/mypage/messages");
    }
  } catch {
    // 쪽지 실패해도 발급은 완료된 상태이므로 무시
  }

  revalidatePath("/coupons");
  revalidatePath("/mypage");
  return { ok: true, reservationCode: result.reservationCode };
}

// ── shop 권한: 본인 owned 쿠폰만 ─────────────────────────────────────────────
async function requireShopUser() {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." } as const;
  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);
  if (!user) return { error: "회원 정보를 찾을 수 없습니다." } as const;
  if (user.role !== "shop" && user.role !== "admin") {
    return { error: "업소회원만 사용할 수 있습니다." } as const;
  }
  return { userId, role: user.role } as const;
}

function assertShopOwnsCoupon(couponId: number, userId: number, role: "shop" | "admin"): string | null {
  if (role === "admin") return null;
  const coupon = getCoupons().find((c) => c.id === couponId);
  if (!coupon) return "쿠폰을 찾을 수 없습니다.";
  if (coupon.ownerUserId !== userId) return "본인 쿠폰만 관리할 수 있습니다.";
  return null;
}

export async function actionShopCreateCoupon(formData: FormData) {
  const auth = await requireShopUser();
  if ("error" in auth) return { error: auth.error };
  const input = parseCouponForm(formData);
  // 강제: ownerUserId = 본인, type = "coupon"
  input.ownerUserId = auth.userId;
  input.type = "coupon";
  const err = validateCouponInput(input);
  if (err) return { error: err };
  createCoupon(input);
  revalidatePath("/shop/coupons");
  revalidatePath("/shop/dashboard");
  revalidatePath("/coupons");
  return { ok: true };
}

export async function actionShopUpdateCoupon(formData: FormData) {
  const auth = await requireShopUser();
  if ("error" in auth) return { error: auth.error };
  const id = parseInt(formData.get("id") as string, 10);
  if (!id) return { error: "잘못된 요청입니다." };
  const ownErr = assertShopOwnsCoupon(id, auth.userId, auth.role);
  if (ownErr) return { error: ownErr };
  const input = parseCouponForm(formData);
  input.ownerUserId = auth.role === "admin" ? input.ownerUserId : auth.userId;
  input.type = "coupon";
  const err = validateCouponInput(input);
  if (err) return { error: err };
  updateCoupon(id, input);
  revalidatePath("/shop/coupons");
  revalidatePath("/shop/dashboard");
  revalidatePath("/coupons");
  return { ok: true };
}

export async function actionShopDeleteCoupon(couponId: number) {
  const auth = await requireShopUser();
  if ("error" in auth) return { error: auth.error };
  const ownErr = assertShopOwnsCoupon(couponId, auth.userId, auth.role);
  if (ownErr) return { error: ownErr };
  deleteCoupon(couponId);
  revalidatePath("/shop/coupons");
  revalidatePath("/shop/dashboard");
  revalidatePath("/coupons");
  return { ok: true };
}

export async function actionShopToggleCouponActive(couponId: number, isActive: boolean) {
  const auth = await requireShopUser();
  if ("error" in auth) return { error: auth.error };
  const ownErr = assertShopOwnsCoupon(couponId, auth.userId, auth.role);
  if (ownErr) return { error: ownErr };
  updateCoupon(couponId, { isActive });
  revalidatePath("/shop/coupons");
  revalidatePath("/coupons");
  return { ok: true };
}

// ── 사용 확인 (업소 사장 전용) ──────────────────────────────────────────────
//   shop 사장이 손님이 제시한 닉네임/예약코드를 검색 → 사용 확인 시 usedAt 기록
export async function actionMarkCouponUsed(userCouponId: number) {
  const auth = await requireShopUser();
  if ("error" in auth) return { error: auth.error };

  // shop 인 경우, 해당 user_coupon 의 couponId 가 본인 owned 인지 검증
  if (auth.role === "shop") {
    const uc = getUserCouponById(userCouponId);
    if (!uc) return { error: "쿠폰을 찾을 수 없습니다." };
    const own = assertShopOwnsCoupon(uc.couponId, auth.userId, auth.role);
    if (own) return { error: own };
  }

  markCouponUsed(userCouponId);
  revalidatePath("/mypage");
  revalidatePath("/shop/dashboard");
  revalidatePath("/shop/coupons/verify");
  return { ok: true };
}
