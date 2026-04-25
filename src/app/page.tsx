import { Suspense } from "react";
import ShopCard from "@/components/ShopCard";
import ShopListCard from "@/components/ShopListCard";
import ShopBoardTable from "@/components/ShopBoardRow";
import AreaFilter from "@/components/AreaFilter";
import Pagination from "@/components/Pagination";
import { getAreas, getShops } from "@/lib/data";
import { getSiteConfig } from "@/lib/siteConfig";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ area?: string; q?: string; page?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const area = params.area ?? "";
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const [areas, shopsResult, config] = await Promise.all([
    Promise.resolve(getAreas()),
    Promise.resolve(getShops(area, q, page)),
    getSiteConfig(),
  ]);
  const { shops, total } = shopsResult;
  const layout = config.mainLayout;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Suspense fallback={<div className="h-10" />}>
          <AreaFilter areas={areas} />
        </Suspense>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm text-gray-500">
          {area ? <><span className="font-bold text-gray-800">{area}</span> · </> : ""}
          {q ? <><span className="font-bold text-gray-800">&quot;{q}&quot;</span> 검색 결과 · </> : ""}
          총 <span className="font-bold text-gray-800">{total.toLocaleString()}</span>개
        </h2>
      </div>

      {shops.length === 0 ? (
        <div className="text-center py-24 text-gray-400">등록된 업소가 없습니다.</div>
      ) : layout === "BOARD" ? (
        <ShopBoardTable shops={shops} />
      ) : layout === "LIST_CARD" ? (
        <div className="space-y-3">
          {shops.map((shop) => <ShopListCard key={shop.id} shop={shop} />)}
        </div>
      ) : (
        // GRID (기본)
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  );
}
