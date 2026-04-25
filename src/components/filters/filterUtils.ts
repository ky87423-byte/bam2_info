"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * 필터 컴포넌트 4종 공통 유틸:
 *   - URL 쿼리(area, category) 읽기/쓰기
 *   - 페이지 갱신 시 page=1 리셋
 *   - 동일 시그니처로 모든 필터 컴포넌트가 사용
 */
export function useFilterParams() {
  const router = useRouter();
  const params = useSearchParams();
  const area     = params.get("area")     ?? "";
  const category = params.get("category") ?? "";

  function update(next: { area?: string; category?: string }) {
    const p = new URLSearchParams(params.toString());
    if (next.area !== undefined) {
      if (next.area) p.set("area", next.area); else p.delete("area");
    }
    if (next.category !== undefined) {
      if (next.category) p.set("category", next.category); else p.delete("category");
    }
    p.delete("page");   // 필터 변경 시 첫 페이지로
    router.push(`/?${p.toString()}`);
  }

  return { area, category, update };
}

export interface AreaItem { name: string; count: number }
export interface CatItem  { code: string; count: number }

export interface FilterProps {
  areas:      AreaItem[];
  categories: CatItem[];
}
