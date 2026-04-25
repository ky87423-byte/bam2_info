import { prisma } from "./prisma";

/**
 * 사이트 전역 설정 (singleton, id=1).
 * 관리자가 토글하는 마스터 스위치들을 모은 테이블.
 *
 * 사용처:
 *   - Header (메뉴 노출 여부)
 *   - /shop-community 라우트 가드
 *   - /admin/settings 토글 폼
 */

export interface SiteConfigData {
  id: number;
  isShopCommunityActive: boolean;
  updatedAt: Date;
}

const DEFAULT: SiteConfigData = {
  id: 1,
  isShopCommunityActive: false,
  updatedAt: new Date(0),
};

/** 항상 1행만 존재하는 SiteConfig 를 조회. 없으면 default 반환. */
export async function getSiteConfig(): Promise<SiteConfigData> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    return row ?? DEFAULT;
  } catch {
    // DB 미연결 등 오류 시 안전한 기본값 (모든 토글 OFF)
    return DEFAULT;
  }
}

/** admin 만 호출. 부분 업데이트 허용. */
export async function updateSiteConfig(data: Partial<Omit<SiteConfigData, "id" | "updatedAt">>): Promise<SiteConfigData> {
  const row = await prisma.siteConfig.upsert({
    where:  { id: 1 },
    update: data,
    create: { id: 1, ...data, isShopCommunityActive: data.isShopCommunityActive ?? false },
  });
  return row;
}
