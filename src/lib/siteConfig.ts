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

// ── In-process 캐시 (5분 TTL) ────────────────────────────────────────────
//   헤더가 거의 모든 페이지에서 호출 → DB 쿼리 1만큼 절약.
//   updateSiteConfig 가 즉시 invalidate.
const CACHE_TTL_MS = 5 * 60_000;
let _cache: { at: number; data: SiteConfigData } | null = null;

export async function getSiteConfig(): Promise<SiteConfigData> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.data;
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const data: SiteConfigData = row
      ? {
          id: row.id,
          isShopCommunityActive: row.isShopCommunityActive,
          mainLayout:   String(row.mainLayout)   as MainLayoutValue,
          filterLayout: String(row.filterLayout) as FilterLayoutValue,
          updatedAt: row.updatedAt,
        }
      : DEFAULT;
    _cache = { at: Date.now(), data };
    return data;
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
  _cache = null;        // 즉시 invalidate — 다음 호출이 fresh DB read
}
