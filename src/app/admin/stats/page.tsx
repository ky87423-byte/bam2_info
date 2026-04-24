import { getShops, getAreas } from "@/lib/data";
import { TrendingUp, Eye, MapPin, Store } from "lucide-react";

export default function AdminStatsPage() {
  const { shops: allShops, total } = getShops("", "", 1, 99999);
  const areas = getAreas();

  const totalHit = allShops.reduce((sum, s) => sum + s.hit, 0);
  const withPhoto = allShops.filter((s) => s.mainPhoto).length;
  const hidden = allShops.filter((s) => !s.isVisible).length;

  // 상위 조회수 업소
  const topByHit = [...allShops]
    .sort((a, b) => b.hit - a.hit)
    .slice(0, 10);
  const maxHit = topByHit[0]?.hit || 1;

  // 지역별 업소 수 (상위 10개)
  const areaCounts: Record<string, number> = {};
  for (const s of allShops) {
    const a = s.area.replace(/,+$/, "").trim();
    if (a) areaCounts[a] = (areaCounts[a] ?? 0) + 1;
  }
  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxArea = topAreas[0]?.[1] || 1;

  // 업종별 업소 수 (상위 10개)
  const catCounts: Record<string, number> = {};
  for (const s of allShops) {
    if (s.category) catCounts[s.category] = (catCounts[s.category] ?? 0) + 1;
  }
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxCat = topCats[0]?.[1] || 1;

  const statCards = [
    { label: "전체 업소", value: total.toLocaleString() + "개", icon: Store, color: "bg-blue-500" },
    { label: "전체 지역", value: areas.length + "개", icon: MapPin, color: "bg-green-500" },
    { label: "총 조회수", value: totalHit.toLocaleString(), icon: Eye, color: "bg-purple-500" },
    { label: "사진 보유율", value: total ? `${Math.round((withPhoto / total) * 100)}%` : "0%", icon: TrendingUp, color: "bg-yellow-500" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">통계</h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`${color} text-white p-3 rounded-lg`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 상세 지표 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatBox label="사진 보유 업소" value={withPhoto.toLocaleString() + "개"} sub={`전체의 ${total ? Math.round((withPhoto / total) * 100) : 0}%`} />
        <StatBox label="숨김 처리 업소" value={hidden.toLocaleString() + "개"} sub="비노출 상태" />
        <StatBox label="평균 조회수" value={total ? Math.round(totalHit / total).toLocaleString() : "0"} sub="업소당 평균" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 조회수 TOP 10 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">조회수 TOP 10 업소</h3>
          <div className="space-y-2.5">
            {topByHit.map((shop, i) => (
              <div key={shop.id} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 text-right ${i < 3 ? "text-yellow-500" : "text-gray-400"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-800 truncate">{shop.company}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0">{shop.hit.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${(shop.hit / maxHit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 지역별 분포 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">지역별 업소 분포 TOP 10</h3>
          <div className="space-y-2.5">
            {topAreas.map(([area, count], i) => (
              <div key={area} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 text-right ${i < 3 ? "text-green-500" : "text-gray-400"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-800 truncate">{area}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0">{count}개</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${(count / maxArea) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 업종별 분포 */}
      {topCats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">업종별 분포 TOP 10</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {topCats.map(([cat, count], i) => (
              <div key={cat} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 text-right ${i < 3 ? "text-purple-500" : "text-gray-400"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-800 truncate">{cat}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0">{count}개</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
