"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateSiteConfig } from "@/lib/siteConfig";

export async function setShopCommunityActiveAction(isActive: boolean) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false as const, error: "권한이 없습니다." };

  await updateSiteConfig({ isShopCommunityActive: isActive });
  // 메뉴 즉시 반영
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}
