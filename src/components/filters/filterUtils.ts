"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * 필터 컴포넌트 4종 공통 유틸:
 *   - URL 쿼리(area, bizType) 읽기/쓰기
 *   - 페이지 갱신 시 page=1 리셋
 *   - 동일 시그니처로 모든 필터 컴포넌트가 사용
 */
export function useFilterParams() {
  const router = useRouter();
  const params = useSearchParams();
  const area    = params.get("area")    ?? "";
  const bizType = params.get("bizType") ?? "";

  function update(next: { area?: string; bizType?: string }) {
    const p = new URLSearchParams(params.toString());
    if (next.area !== undefined) {
      if (next.area) p.set("area", next.area); else p.delete("area");
    }
    if (next.bizType !== undefined) {
      if (next.bizType) p.set("bizType", next.bizType); else p.delete("bizType");
    }
    p.delete("page");   // 필터 변경 시 첫 페이지로
    router.push(`/?${p.toString()}`);
  }

  return { area, bizType, update };
}

export interface AreaItem { name: string; count: number }
export interface BizItem  { name: string; count: number }

export interface FilterProps {
  areas:    AreaItem[];
  bizTypes: BizItem[];
}
