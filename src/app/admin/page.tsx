import { getAreas, getShops } from "@/lib/data";
import { Store, MapPin, Eye, Image as ImageIcon } from "lucide-react";

export default function AdminDashboard() {
  const areas = getAreas();
  const { total } = getShops("", "", 1);
  const { shops: topShops } = getShops("", "", 1);

  const withPhoto = topShops.filter((s) => s.mainPhoto).length;
  const totalHit = topShops.reduce((sum, s) => sum + s.hit, 0);

  const statCards = [
    { label: "전체 업소", value: total.toLocaleString() + "개", icon: Store, color: "bg-blue-500" },
    { label: "등록 지역", value: areas.length + "개", icon: MapPin, color: "bg-green-500" },
    { label: "사진 보유", value: withPhoto + "개", icon: ImageIcon, color: "bg-purple-500" },
    { label: "총 조회수", value: totalHit.toLocaleString(), icon: Eye, color: "bg-yellow-500" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">대시보드</h2>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* 지역별 업소 수 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">지역별 업소 수</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {areas.slice(0, 20).map((area) => {
            const { total: cnt } = getShops(area, "", 1);
            return (
              <div key={area} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-gray-500">{area}</p>
                <p className="font-bold text-gray-800 text-sm">{cnt}개</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
