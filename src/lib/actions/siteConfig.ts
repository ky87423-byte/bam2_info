"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateSiteConfig, type MainLayoutValue, type FilterLayoutValue } from "@/lib/siteConfig";

export async function setShopCommunityActiveAction(isActive: boolean) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false as const, error: "권한이 없습니다." };

  await updateSiteConfig({ isShopCommunityActive: isActive });
  // 메뉴 즉시 반영
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

const VALID_LAYOUTS: MainLayoutValue[]   = ["GRID", "LIST_CARD", "BOARD"];
const VALID_FILTERS: FilterLayoutValue[] = ["DOUBLE_TAB", "DROPDOWN", "SIDEBAR", "TAB_SWITCH"];

export async function setMainLayoutAction(layout: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false as const, error: "권한이 없습니다." };
  if (!VALID_LAYOUTS.includes(layout as MainLayoutValue)) {
    return { ok: false as const, error: "잘못된 레이아웃 값입니다." };
  }

  await updateSiteConfig({ mainLayout: layout as MainLayoutValue });
  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function setFilterLayoutAction(filterLayout: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false as const, error: "권한이 없습니다." };
  if (!VALID_FILTERS.includes(filterLayout as FilterLayoutValue)) {
    return { ok: false as const, error: "잘못된 필터 레이아웃 값입니다." };
  }

  await updateSiteConfig({ filterLayout: filterLayout as FilterLayoutValue });
  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}
