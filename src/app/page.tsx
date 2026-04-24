import { Suspense } from "react";
import ShopCard from "@/components/ShopCard";
import AreaFilter from "@/components/AreaFilter";
import Pagination from "@/components/Pagination";
import { getAreas, getShops } from "@/lib/data";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ area?: string; q?: string; page?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const area = params.area ?? "";
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const areas = getAreas();
  const { shops, total } = getShops(area, q, page);

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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  );
}
