import { prisma } from "./prisma";
import { MainLayout } from "@/generated/prisma/enums";

/**
 * 사이트 전역 설정 (singleton, id=1).
 * 관리자가 토글하는 마스터 스위치들을 모은 테이블.
 *
 * 사용처:
 *   - Header (메뉴 노출 여부)
 *   - /shop-community 라우트 가드
 *   - 메인 페이지 레이아웃 분기
 *   - /admin/settings 토글·라디오 폼
 */

export type MainLayoutValue = "GRID" | "LIST_CARD" | "BOARD";

export interface SiteConfigData {
  id: number;
  isShopCommunityActive: boolean;
  mainLayout: MainLayoutValue;
  updatedAt: Date;
}

const DEFAULT: SiteConfigData = {
  id: 1,
  isShopCommunityActive: false,
  mainLayout: "GRID",
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
      mainLayout: String(row.mainLayout) as MainLayoutValue,
      updatedAt: row.updatedAt,
    };
  } catch {
    // DB 미연결 등 오류 시 안전한 기본값 (모든 토글 OFF)
    return DEFAULT;
  }
}

/** admin 만 호출. 부분 업데이트 허용. */
export async function updateSiteConfig(data: Partial<Omit<SiteConfigData, "id" | "updatedAt">>): Promise<void> {
  // string 으로 들어온 mainLayout 을 prisma enum 타입으로 변환
  const updateData: Record<string, unknown> = {};
  if (data.isShopCommunityActive !== undefined) updateData.isShopCommunityActive = data.isShopCommunityActive;
  if (data.mainLayout !== undefined)            updateData.mainLayout            = data.mainLayout as MainLayout;

  await prisma.siteConfig.upsert({
    where:  { id: 1 },
    update: updateData,
    create: {
      id: 1,
      isShopCommunityActive: data.isShopCommunityActive ?? false,
      mainLayout: (data.mainLayout ?? "GRID") as MainLayout,
    },
  });
}
