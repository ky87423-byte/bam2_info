import Link from "next/link";
import type { ShopData } from "@/lib/data";

interface Props {
  shops: ShopData[];
}

/** 게시판형 — 테이블 레이아웃, 한 줄당 한 업소 (밀도 ↑) */
export default function ShopBoardTable({ shops }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">업소명</th>
              <th className="px-4 py-2.5 text-left font-medium">지역</th>
              <th className="px-4 py-2.5 text-left font-medium">카테고리</th>
              <th className="px-4 py-2.5 text-right font-medium">조회</th>
              <th className="px-4 py-2.5 text-right font-medium">가격</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shops.map((shop) => {
              const areaClean  = shop.area.replace(/,+$/, "").trim();
              const priceLabel = shop.price > 0 ? `${(shop.price / 10000).toFixed(0)}만원` : "—";
              return (
                <tr key={shop.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/shop/${shop.id}`} className="font-semibold text-gray-800 hover:text-indigo-600 hover:underline">
                      {shop.company}
                    </Link>
                    {shop.subject && (
                      <p className="text-[11px] text-gray-400 truncate max-w-[280px] sm:max-w-[400px]">{shop.subject}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{areaClean}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {shop.category}{shop.category2 ? ` · ${shop.category2}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 text-right tabular-nums whitespace-nowrap">
                    {shop.hit.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                    {shop.price > 0 ? (
                      <span className="font-semibold text-blue-700">{priceLabel}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
