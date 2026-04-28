"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  awardPoints, getUserById, getSettings,
  createReview, updateReview, deleteReview, getReviewById,
  findReviewByUserCouponId, getUserCouponById, getCoupons, REVIEW_BIZ_TYPES,
  type ReviewData,
} from "@/lib/data";

interface ParsedInput {
  title:           string;
  content:         string;
  bizType:         string;
  shopName:        string;
  ratingFacility:  number;
  ratingService:   number;
  ratingPrice:     number;
  tags:            string[];
  photos:          string[];
  mainPhoto:       string;
  userCouponId?:   number;
}

function parseForm(formData: FormData): ParsedInput {
  let photos: string[] = [];
  try {
    const raw = formData.get("photos");
    if (typeof raw === "string" && raw) photos = JSON.parse(raw).slice(0, 30);
  } catch { /* ignore */ }
  const mainPhoto = (formData.get("mainPhoto") as string) || photos[0] || "";

  // tags — 폼에서 동일 name 으로 다중 전송됨
  const tags = (formData.getAll("tags") as string[]).filter(Boolean).slice(0, 10);

  const ucIdRaw = formData.get("userCouponId");
  const userCouponId = ucIdRaw ? parseInt(ucIdRaw as string, 10) : undefined;

  const num = (k: string) => {
    const v = parseInt((formData.get(k) as string) ?? "0", 10);
    return Number.isFinite(v) ? Math.max(1, Math.min(5, v)) : 1;
  };

  return {
    title:          ((formData.get("title") as string) || "").trim(),
    content:        ((formData.get("content") as string) || "").trim(),
    bizType:        ((formData.get("bizType") as string) || "").trim(),
    shopName:       ((formData.get("shopName") as string) || "").trim(),
    ratingFacility: num("ratingFacility"),
    ratingService:  num("ratingService"),
    ratingPrice:    num("ratingPrice"),
    tags,
    photos,
    mainPhoto,
    userCouponId,
  };
}

function validate(input: ParsedInput): string | null {
  if (!input.title || input.title.length < 2)        return "제목을 2자 이상 입력하세요.";
  if (input.title.length > 80)                        return "제목은 80자 이내로 작성하세요.";
  if (!input.content || input.content.length < 10)   return "후기 본문을 10자 이상 작성해주세요.";
  if (input.content.length > 5000)                    return "후기는 5,000자 이내로 작성하세요.";
  if (!input.bizType)                                 return "업종 말머리를 선택해주세요.";
  if (!input.shopName)                                return "업소명을 입력해주세요.";
  return null;
}

// ── 일반 후기 ────────────────────────────────────────────────────────────────
export async function actionCreateReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id);
  const user   = await getUserById(userId);
  if (!user) return { error: "회원 정보를 찾을 수 없습니다." };

  const input = parseForm(formData);
  // 일반 후기는 userCouponId 무시 (인증 안 됨)
  input.userCouponId = undefined;
  const err = validate(input);
  if (err) return { error: err };

  const settings = getSettings();
  const review = createReview({
    authorId:        userId,
    authorUsername:  user.username,
    authorNickname:  user.nickname,
    userCouponId:    null,
    couponId:        null,
    isCertified:     false,
    shopName:        input.shopName,
    bizType:         input.bizType,
    title:           input.title,
    content:         input.content,
    photos:          input.photos,
    mainPhoto:       input.mainPhoto,
    ratingFacility:  input.ratingFacility,
    ratingService:   input.ratingService,
    ratingPrice:     input.ratingPrice,
    tags:            input.tags,
  });

  // 차등 보상 — 일반 후기 (적게)
  await awardPoints(userId, "post", settings.pointReview, `후기 작성 #${review.id}`).catch(() => {});

  revalidatePath("/reviews");
  revalidatePath("/mypage");
  return { ok: true, id: review.id };
}

// ── 인증 후기 (쿠폰 사용 후) ─────────────────────────────────────────────────
export async function actionCreateCertifiedReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id);
  const user   = await getUserById(userId);
  if (!user) return { error: "회원 정보를 찾을 수 없습니다." };

  const input = parseForm(formData);
  if (!input.userCouponId) return { error: "인증 정보가 없습니다." };

  // user_coupon 검증
  const uc = getUserCouponById(input.userCouponId);
  if (!uc)                       return { error: "쿠폰 발급 내역을 찾을 수 없습니다." };
  if (uc.userId !== userId)      return { error: "본인 쿠폰만 후기 작성이 가능합니다." };
  if (!uc.usedAt)                return { error: "사용 확인된 쿠폰만 인증 후기 작성이 가능합니다. 매장에서 [사용 확인]을 받아주세요." };

  // 중복 작성 방지 (1 쿠폰 = 1 인증 후기)
  if (findReviewByUserCouponId(uc.id)) return { error: "이미 이 쿠폰으로 후기를 작성하셨습니다." };

  // 쿠폰의 shopName / bizType 강제 (read-only 우회 차단)
  const coupon = getCoupons().find((c) => c.id === uc.couponId);
  if (!coupon)                       return { error: "원본 쿠폰을 찾을 수 없습니다." };
  const shopName = coupon.shopName || input.shopName;
  const bizType  = coupon.bizType  || input.bizType;
  if (!shopName || !bizType)         return { error: "쿠폰 정보가 부족하여 인증 후기를 작성할 수 없습니다." };

  // 본문 검증 (shopName/bizType 은 우리가 강제로 넣어주므로 통과)
  const finalInput = { ...input, shopName, bizType };
  const err = validate(finalInput);
  if (err) return { error: err };

  const settings = getSettings();
  const review = createReview({
    authorId:        userId,
    authorUsername:  user.username,
    authorNickname:  user.nickname,
    userCouponId:    uc.id,
    couponId:        coupon.id,
    isCertified:     true,
    shopName,
    bizType,
    title:           finalInput.title,
    content:         finalInput.content,
    photos:          finalInput.photos,
    mainPhoto:       finalInput.mainPhoto,
    ratingFacility:  finalInput.ratingFacility,
    ratingService:   finalInput.ratingService,
    ratingPrice:     finalInput.ratingPrice,
    tags:            finalInput.tags,
  });

  // 차등 보상 — 인증 후기 (많이)
  await awardPoints(userId, "post", settings.pointCertifiedReview, `[인증] 후기 작성 #${review.id}`).catch(() => {});

  revalidatePath("/reviews");
  revalidatePath("/mypage");
  revalidatePath(`/coupons/${coupon.id}`);
  return { ok: true, id: review.id };
}

export async function actionUpdateReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id);

  const id = parseInt((formData.get("id") as string) ?? "0", 10);
  const existing = id ? getReviewById(id) : null;
  if (!existing) return { error: "후기를 찾을 수 없습니다." };
  const isAdmin = session.user.role === "admin";
  if (existing.authorId !== userId && !isAdmin) return { error: "수정 권한이 없습니다." };

  const input = parseForm(formData);
  // 인증 후기는 shopName/bizType 잠금
  const finalShop = existing.isCertified ? existing.shopName : input.shopName;
  const finalBiz  = existing.isCertified ? existing.bizType  : input.bizType;
  const finalInput = { ...input, shopName: finalShop, bizType: finalBiz };
  const err = validate(finalInput);
  if (err) return { error: err };

  const updated: Partial<ReviewData> = {
    title:           finalInput.title,
    content:         finalInput.content,
    shopName:        finalShop,
    bizType:         finalBiz,
    photos:          finalInput.photos,
    mainPhoto:       finalInput.mainPhoto,
    ratingFacility:  finalInput.ratingFacility,
    ratingService:   finalInput.ratingService,
    ratingPrice:     finalInput.ratingPrice,
    tags:            finalInput.tags,
  };
  updateReview(id, updated);

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${id}`);
  return { ok: true };
}

export async function actionDeleteReview(id: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  const userId = parseInt(session.user.id);
  const isAdmin = session.user.role === "admin";

  const review = getReviewById(id);
  if (!review) return { error: "후기를 찾을 수 없습니다." };
  if (review.authorId !== userId && !isAdmin) return { error: "삭제 권한이 없습니다." };

  deleteReview(id);
  revalidatePath("/reviews");
  return { ok: true };
}

// ── 클라이언트 helper — 폼에서 사용 ──────────────────────────────────────────
export async function getCertifiedReviewContext(userCouponId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." } as const;
  const userId = parseInt(session.user.id);

  const uc = getUserCouponById(userCouponId);
  if (!uc)                  return { error: "쿠폰 발급 내역을 찾을 수 없습니다." } as const;
  if (uc.userId !== userId) return { error: "본인 쿠폰만 접근 가능합니다." } as const;
  if (!uc.usedAt)           return { error: "[사용 확인] 처리된 쿠폰만 인증 후기를 작성할 수 있습니다." } as const;
  if (findReviewByUserCouponId(uc.id)) return { error: "이미 이 쿠폰으로 후기를 작성했습니다." } as const;

  const coupon = getCoupons().find((c) => c.id === uc.couponId);
  if (!coupon) return { error: "원본 쿠폰을 찾을 수 없습니다." } as const;

  return {
    ok: true,
    userCouponId: uc.id,
    shopName: coupon.shopName,
    bizType:  coupon.bizType ?? "",
    couponTitle: coupon.title,
  } as const;
}

export async function listAvailableBizTypes(): Promise<string[]> {
  return [...REVIEW_BIZ_TYPES];
}
