"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * 필터 컴포넌트 4종 공통 유틸:
 *   URL 쿼리 = { region, area, bizType, q, page }
 *   - region: 광역 cat 코드 (예: "1"=강남권, "10"=서울)
 *   - area:   세부 지역명 (예: "강남")  — 선택 시 region 보다 우선
 *   - bizType: 업종 (예: "건마")
 *   필터 변경 시 page=1 리셋, q 는 유지 (검색바와 동기화)
 */
export function useFilterParams() {
  const router = useRouter();
  const params = useSearchParams();
  const region  = params.get("region")  ?? "";
  const area    = params.get("area")    ?? "";
  const bizType = params.get("bizType") ?? "";

  function update(next: { region?: string; area?: string; bizType?: string }) {
    const p = new URLSearchParams(params.toString());
    for (const key of ["region", "area", "bizType"] as const) {
      if (next[key] !== undefined) {
        if (next[key]) p.set(key, next[key]!); else p.delete(key);
      }
    }
    p.delete("page");
    router.push(`/?${p.toString()}`);
  }

  return { region, area, bizType, update };
}

export interface RegionGroupItem {
  code:  string;
  name:  string;
  count: number;
  areas: { name: string; count: number }[];
}

export interface BizItem { name: string; count: number }

export interface FilterProps {
  regionGroups: RegionGroupItem[];
  bizTypes:     BizItem[];
}
