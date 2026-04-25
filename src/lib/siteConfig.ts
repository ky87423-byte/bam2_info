import { prisma } from "./prisma";
import { MainLayout, FilterLayout } from "@/generated/prisma/enums";

/**
 * 사이트 전역 설정 (singleton, id=1).
 * 관리자가 토글하는 마스터 스위치들을 모은 테이블.
 */

export type MainLayoutValue   = "GRID" | "LIST_CARD" | "BOARD";
export type FilterLayoutValue = "DOUBLE_TAB" | "DROPDOWN" | "SIDEBAR" | "TAB_SWITCH";

export interface SiteConfigData {
  id: number;
  isShopCommunityActive: boolean;
  mainLayout:   MainLayoutValue;
  filterLayout: FilterLayoutValue;
  updatedAt: Date;
}

const DEFAULT: SiteConfigData = {
  id: 1,
  isShopCommunityActive: false,
  mainLayout:   "GRID",
  filterLayout: "DOUBLE_TAB",
  updatedAt: new Date(0),
};

/** 항상 1행만 존재하는 SiteConfig 를 조회. 없으면 default 반환. */
export async function getSiteConfig(): Promise<SiteConfigData> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return DEFAULT;
    return {
      id: row.id,
      isShopCommunityActive: row.isShopCommunityActive,
      mainLayout:   String(row.mainLayout)   as MainLayoutValue,
      filterLayout: String(row.filterLayout) as FilterLayoutValue,
      updatedAt: row.updatedAt,
    };
  } catch {
    return DEFAULT;
  }
}

/** admin 만 호출. 부분 업데이트 허용. */
export async function updateSiteConfig(data: Partial<Omit<SiteConfigData, "id" | "updatedAt">>): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.isShopCommunityActive !== undefined) updateData.isShopCommunityActive = data.isShopCommunityActive;
  if (data.mainLayout   !== undefined)          updateData.mainLayout            = data.mainLayout   as MainLayout;
  if (data.filterLayout !== undefined)          updateData.filterLayout          = data.filterLayout as FilterLayout;

  await prisma.siteConfig.upsert({
    where:  { id: 1 },
    update: updateData,
    create: {
      id: 1,
      isShopCommunityActive: data.isShopCommunityActive ?? false,
      mainLayout:   (data.mainLayout   ?? "GRID")       as MainLayout,
      filterLayout: (data.filterLayout ?? "DOUBLE_TAB") as FilterLayout,
    },
  });
}
