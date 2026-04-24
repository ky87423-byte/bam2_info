import { getAreas, getShops } from "@/lib/data";
import { MapPin, Hash } from "lucide-react";

export default function AdminCategoriesPage() {
  const areas = getAreas();

  // 지역별 업소 수 + 카테고리 정보 수집
  const areaStats = areas.map((area) => {
    const { total, shops } = getShops(area, "", 1);
    const categories = [...new Set(shops.map((s) => s.category).filter(Boolean))];
    const withPhoto = shops.filter((s) => s.mainPhoto).length;
    return { area, total, categories, withPhoto };
  });

  // 전체 카테고리(업종) 목록
  const { shops: allShops } = getShops("", "", 1);
  const allCategories = [...new Map(
    allShops
      .filter((s) => s.category)
      .map((s) => [s.category, { name: s.category, cat2: s.category2 }])
  ).values()];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">카테고리 관리</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 지역 목록 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            지역 목록 ({areas.length}개)
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {areaStats.map(({ area, total }) => (
              <div
                key={area}
                className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{area}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">업소 {total}개</span>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    활성
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 업종 목록 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Hash size={16} className="text-green-500" />
            업종 목록
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {allCategories.length > 0 ? (
              allCategories.map(({ name, cat2 }) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-800">{name}</span>
                  {cat2 && (
                    <span className="text-xs text-gray-400">{cat2}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>현재 수집된 업종 데이터가 없습니다.</p>
                <p className="text-xs mt-1">스크래핑 완료 후 업종 정보가 채워집니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 지역 × 업종 통계 요약 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mt-6">
        <h3 className="font-semibold text-gray-700 mb-4">지역별 요약</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 text-gray-500 font-medium">지역</th>
                <th className="px-4 py-2 text-gray-500 font-medium text-center">업소 수</th>
                <th className="px-4 py-2 text-gray-500 font-medium text-center">사진 보유</th>
                <th className="px-4 py-2 text-gray-500 font-medium">주요 업종</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {areaStats.slice(0, 15).map(({ area, total, withPhoto, categories }) => (
                <tr key={area} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{area}</td>
                  <td className="px-4 py-2.5 text-center text-gray-700">{total}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{withPhoto}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {categories.slice(0, 3).map((cat) => (
                        <span key={cat} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
