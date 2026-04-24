import Link from "next/link";
import { getAreas, getShops } from "@/lib/data";
import { Search, Pencil, Eye, ImageIcon } from "lucide-react";

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{ area?: string; q?: string; page?: string }>;
}

export default async function AdminShopsPage({ searchParams }: Props) {
  const params = await searchParams;
  const area = params.area ?? "";
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const areas = getAreas();
  const { shops, total } = getShops(area, q, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">업소 관리</h2>
        <span className="text-sm text-gray-500">총 {total.toLocaleString()}개</span>
      </div>

      {/* 검색 / 필터 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
        <form method="GET" className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="업소명 검색..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <select
            name="area"
            defaultValue={area}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
          >
            <option value="">전체 지역</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            검색
          </button>
          {(q || area) && (
            <Link
              href="/admin/shops"
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              초기화
            </Link>
          )}
        </form>
      </div>

      {/* 업소 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left">
              <th className="px-4 py-3 text-gray-500 font-medium w-10">#</th>
              <th className="px-4 py-3 text-gray-500 font-medium">업소명</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-20">지역</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-24">전화</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">가격</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-16 text-center">사진</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">조회수</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-16 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shops.map((shop, i) => {
              const areaClean = shop.area.replace(/,+$/, "").trim();
              const priceLabel = shop.price > 0 ? `${(shop.price / 10000).toFixed(0)}만` : "-";
              const photoCount = (shop.mainPhoto ? 1 : 0) + shop.photos.length;

              return (
                <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 truncate max-w-[200px]">
                      {shop.company}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[200px]">
                      {shop.subject}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {areaClean || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{shop.phone || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-yellow-600 font-medium">{priceLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs ${photoCount > 0 ? "text-green-600" : "text-gray-300"}`}>
                      <ImageIcon size={12} />
                      {photoCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Eye size={12} />
                      {shop.hit > 0 ? shop.hit.toLocaleString() : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/shops/${shop.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors"
                    >
                      <Pencil size={11} />
                      수정
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {shops.length === 0 && (
          <div className="text-center py-16 text-gray-400">검색 결과가 없습니다.</div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {page > 1 && (
            <Link href={`/admin/shops?area=${area}&q=${q}&page=${page - 1}`}
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">이전</Link>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <Link key={p} href={`/admin/shops?area=${area}&q=${q}&page=${p}`}
                className={`px-3 py-1.5 border rounded text-sm ${p === page ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-gray-50"}`}>
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={`/admin/shops?area=${area}&q=${q}&page=${page + 1}`}
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">다음</Link>
          )}
        </div>
      )}
    </div>
  );
}
