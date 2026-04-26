import { Suspense } from "react";
import dynamic from "next/dynamic";
import ShopCard from "@/components/ShopCard";
import ShopListCard from "@/components/ShopListCard";
import ShopBoardTable from "@/components/ShopBoardRow";
import Pagination from "@/components/Pagination";
import { getAreasWithCounts, getBizTypes, getShops } from "@/lib/data";
import { getSiteConfig } from "@/lib/siteConfig";

// ── 필터 컴포넌트 — dynamic import (활성 레이아웃 chunk 만 다운로드) ─────
const FILTER_COMPONENTS = {
  DOUBLE_TAB: dynamic(() => import("@/components/filters/DoubleTabFilter")),
  DROPDOWN:   dynamic(() => import("@/components/filters/DropdownFilter")),
  SIDEBAR:    dynamic(() => import("@/components/filters/SidebarFilter")),
  TAB_SWITCH: dynamic(() => import("@/components/filters/TabSwitchFilter")),
} as const;

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ area?: string; bizType?: string; q?: string; page?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const params  = await searchParams;
  const area    = params.area    ?? "";
  const bizType = params.bizType ?? "";
  const q       = params.q       ?? "";
  const page    = Math.max(1, parseInt(params.page ?? "1", 10));

  const [areas, bizTypes, shopsResult, config] = await Promise.all([
    Promise.resolve(getAreasWithCounts()),
    Promise.resolve(getBizTypes()),
    Promise.resolve(getShops(area, q, page, PAGE_SIZE, bizType)),
    getSiteConfig(),
  ]);
  const { shops, total } = shopsResult;
  const mainLayout   = config.mainLayout;
  const filterLayout = config.filterLayout;

  // 활성 필터 컴포넌트 1종만 (다른 3종 chunk 다운로드 안 됨)
  const FilterComp = FILTER_COMPONENTS[filterLayout];

  // ── 결과 그리드 (mainLayout 분기) ──────────────────────────────────────
  const shopsGrid = shops.length === 0 ? (
    <div className="text-center py-24 text-gray-400">등록된 업소가 없습니다.</div>
  ) : mainLayout === "BOARD" ? (
    <ShopBoardTable shops={shops} />
  ) : mainLayout === "LIST_CARD" ? (
    <div className="space-y-3">
      {shops.map((shop) => <ShopListCard key={shop.id} shop={shop} />)}
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
    </div>
  );

  // 결과 헤더 + 페이지네이션 (모든 레이아웃 공통)
  const resultHeader = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm text-gray-500">
        {area    ? <><span className="font-bold text-gray-800">{area}</span> · </>     : ""}
        {bizType ? <><span className="font-bold text-gray-800">#{bizType}</span> · </> : ""}
        {q       ? <><span className="font-bold text-gray-800">&quot;{q}&quot;</span> 검색 결과 · </> : ""}
        총 <span className="font-bold text-gray-800">{total.toLocaleString()}</span>개
      </h2>
    </div>
  );
  const pagination = (
    <Suspense fallback={null}>
      <Pagination total={total} page={page} pageSize={PAGE_SIZE} />
    </Suspense>
  );

  // ── filterLayout=SIDEBAR: 페이지 구조 자체가 다름 (좌측 사이드바 + 우측 본문) ─
  if (filterLayout === "SIDEBAR") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-6">
          {/* 사이드바 — 다크 테마 컨테이너 */}
          <aside className="bg-[#1a1a2e] text-white rounded-2xl p-4 mb-4 lg:mb-0 lg:p-0 lg:bg-transparent lg:rounded-none">
            <div className="lg:bg-[#1a1a2e] lg:rounded-2xl lg:p-4">
              <Suspense fallback={<div className="h-40" />}>
                <FilterComp areas={areas} bizTypes={bizTypes} />
              </Suspense>
            </div>
          </aside>
          <main className="min-w-0">
            {resultHeader}
            {shopsGrid}
            {pagination}
          </main>
        </div>
      </div>
    );
  }

  // ── 그 외 (DOUBLE_TAB / DROPDOWN / TAB_SWITCH): 상단 필터 + 본문 ────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-[#1a1a2e] text-white rounded-2xl p-4 mb-5">
        <Suspense fallback={<div className="h-12" />}>
          <FilterComp areas={areas} bizTypes={bizTypes} />
        </Suspense>
      </div>
      {resultHeader}
      {shopsGrid}
      {pagination}
    </div>
  );
}
