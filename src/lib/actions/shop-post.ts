"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createShopPost, updateShopPost, deleteShopPost,
  approveShopPost, rejectShopPost,
  getUserById, countShopPostsByAuthor, getShopPostById,
} from "@/lib/data";

function parsePhotos(raw: string | null): string[] {
  try { return JSON.parse(raw ?? "[]").slice(0, 30); } catch { return []; }
}

export async function actionCreateShopPost(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const authorId = parseInt(session.user.id);
  const user = getUserById(authorId);
  if (!user) return { error: "회원 정보를 찾을 수 없습니다." };
  if (user.role !== "shop" && user.role !== "admin") return { error: "업소회원만 게시글을 작성할 수 있습니다." };

  const limit = user.shopPostLimit ?? 3;
  const count = countShopPostsByAuthor(authorId);
  if (count >= limit) return { error: `게시글은 최대 ${limit}개까지 작성 가능합니다. (관리자 문의)` };

  const company = (formData.get("company") as string ?? "").trim();
  if (!company) return { error: "업소명은 필수 항목입니다." };

  const photos = parsePhotos(formData.get("photos") as string);
  const mainPhoto = (formData.get("mainPhoto") as string || photos[0] || "");

  createShopPost({
    authorId,
    authorUsername: user.username,
    company,
    subject: (formData.get("subject") as string) || undefined,
    content: (formData.get("content") as string) || undefined,
    area: (formData.get("area") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    category2: (formData.get("category2") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    hphone: (formData.get("hphone") as string) || undefined,
    telegram: (formData.get("telegram") as string) || undefined,
    price: parseInt(formData.get("price") as string) || undefined,
    mainPhoto: mainPhoto || undefined,
    photos,
    time1: (formData.get("time1") as string) || undefined,
    time2: (formData.get("time2") as string) || undefined,
    timeFull: formData.get("timeFull") === "on",
  });

  revalidatePath("/shop/dashboard");
  return { success: true };
}

export async function actionUpdateShopPost(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const postId = parseInt(formData.get("postId") as string);
  const post = getShopPostById(postId);
  if (!post) return { error: "게시글을 찾을 수 없습니다." };

  const authorId = parseInt(session.user.id);
  const user = getUserById(authorId);
  if (!user) return { error: "회원 정보를 찾을 수 없습니다." };
  if (post.authorId !== authorId && user.role !== "admin") return { error: "수정 권한이 없습니다." };

  const company = (formData.get("company") as string ?? "").trim();
  if (!company) return { error: "업소명은 필수 항목입니다." };

  const photos = parsePhotos(formData.get("photos") as string);
  const mainPhoto = (formData.get("mainPhoto") as string || photos[0] || "");

  updateShopPost(postId, {
    company,
    subject: (formData.get("subject") as string) || undefined,
    content: (formData.get("content") as string) || undefined,
    area: (formData.get("area") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    category2: (formData.get("category2") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    hphone: (formData.get("hphone") as string) || undefined,
    telegram: (formData.get("telegram") as string) || undefined,
    price: parseInt(formData.get("price") as string) || undefined,
    mainPhoto: mainPhoto || undefined,
    photos,
    time1: (formData.get("time1") as string) || undefined,
    time2: (formData.get("time2") as string) || undefined,
    timeFull: formData.get("timeFull") === "on",
    // 수정 시 재승인 대기 상태로
    status: user.role === "admin" ? post.status : "pending",
    rejectedReason: user.role === "admin" ? post.rejectedReason : undefined,
  });

  revalidatePath("/shop/dashboard");
  revalidatePath(`/shop/post/${postId}/edit`);
  return { success: true };
}

export async function actionDeleteShopPost(postId: number) {
  const session = await auth();
  if (!session?.user?.id) return;

  const post = getShopPostById(postId);
  if (!post) return;

  const authorId = parseInt(session.user.id);
  const user = getUserById(authorId);
  if (!user) return;
  if (post.authorId !== authorId && user.role !== "admin") return;

  deleteShopPost(postId);
  revalidatePath("/shop/dashboard");
  revalidatePath("/admin/shop-posts");
}

export async function actionApproveShopPost(postId: number) {
  const session = await auth();
  if (!session?.user?.id) return;
  const user = getUserById(parseInt(session.user.id));
  if (user?.role !== "admin") return;

  approveShopPost(postId);
  revalidatePath("/admin/shop-posts");
}

export async function actionRejectShopPost(postId: number, reason: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  const user = getUserById(parseInt(session.user.id));
  if (user?.role !== "admin") return;

  rejectShopPost(postId, reason);
  revalidatePath("/admin/shop-posts");
}
