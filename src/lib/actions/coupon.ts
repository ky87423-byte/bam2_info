"use server";

import { revalidatePath } from "next/cache";
import { createCoupon, updateCoupon, deleteCoupon, claimCoupon, markCouponUsed, saveSettings } from "@/lib/data";
import { auth } from "@/auth";

function parseCouponForm(formData: FormData) {
  const shopIdRaw      = formData.get("shopId") as string;
  const ownerUserIdRaw = formData.get("ownerUserId") as string;
  const maxIssueRaw    = formData.get("maxIssue") as string;
  return {
    type:        (formData.get("type") as "coupon" | "event") || "coupon",
    title:       formData.get("title") as string,
    description: formData.get("description") as string,
    discount:    formData.get("discount") as string,
    shopId:      shopIdRaw ? parseInt(shopIdRaw, 10) : null,
    shopName:    formData.get("shopName") as string,
    validUntil:  formData.get("validUntil") as string,
    isActive:    formData.get("isActive") === "on",
    maxIssue:    maxIssueRaw ? parseInt(maxIssueRaw, 10) || 0 : 0,
    ownerUserId: ownerUserIdRaw ? parseInt(ownerUserIdRaw, 10) : null,
  };
}

export async function actionSaveMenuVisibility(couponVisible: boolean, eventVisible: boolean) {
  saveSettings({ menuCouponVisible: couponVisible, menuEventVisible: eventVisible });
  revalidatePath("/", "layout");
  revalidatePath("/admin/coupons");
}

export async function actionCreateCoupon(formData: FormData) {
  createCoupon(parseCouponForm(formData));
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
}

export async function actionUpdateCoupon(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  if (!id) return;
  updateCoupon(id, parseCouponForm(formData));
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
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

export async function actionClaimCoupon(couponId: number): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  const result = await claimCoupon(parseInt(session.user.id), couponId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/coupons");
  revalidatePath("/mypage");
  return { ok: true };
}

export async function actionMarkCouponUsed(userCouponId: number) {
  markCouponUsed(userCouponId);
  revalidatePath("/mypage");
  revalidatePath("/shop/dashboard");
}
