import {
  AlertTriangle, TrendingUp, MapPin, Search,
  Clock, ShieldAlert, Activity, Store, Tag, LineChart,
} from "lucide-react";
import type { AnalyticsData } from "@/types/analytics";
import FunnelChart from "./FunnelChart";
import AreaPieChart from "./AreaPieChart";
import CategoryChart from "./CategoryChart";
import TimeSeriesChart from "./TimeSeriesChart";

// ── 섹션 카드 ─────────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, accent = "blue" }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: "blue" | "green" | "purple" | "amber";
}) {
  const accents = {
    blue:   "text-blue-600 bg-blue-50",
    green:  "text-emerald-600 bg-emerald-50",
    purple: "text-purple-600 bg-purple-50",
    amber:  "text-amber-600 bg-amber-50",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
        <span className={`p-1.5 rounded-lg shrink-0 ${accents[accent]}`}>
          <Icon size={14} />
        </span>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{title}</h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

// ── 이상 징후 알림 배너 ───────────────────────────────────────────────────────

function AlertBanner({ ips }: { ips: AnalyticsData["suspiciousIps"] }) {
  return (
    <div className="flex items-start gap-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl px-4 sm:px-5 py-4 shadow-lg">
      <ShieldAlert size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">이상 징후 감지 — 의심 IP {ips.length}개</p>
        <p className="text-xs text-white/80 mt-0.5 break-all line-clamp-2">
          {ips.slice(0, 3).map((ip) => `${ip.ipAddress} (${ip.eventCount}회)`).join(" · ")}
          {ips.length > 3 && ` 외 ${ips.length - 3}건`}
        </p>
      </div>
      <span className="hidden sm:inline shrink-0 text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium whitespace-nowrap">
        10분 내 감지
      </span>
    </div>
  );
}

// ── 증감률 배지 — 상승 빨강 ↑ / 하락 파랑 ↓ ─────────────────────────────────

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none",
        up ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500",
      ].join(" ")}
      title="이전 동기간 대비"
    >
      {up ? "↑" : "↓"}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ── 요약 카드 ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, trendPct }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trendPct?: number;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-black/5 flex items-center gap-3">
      <div className={`${color} text-white p-2.5 rounded-xl shrink-0`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-gray-800 leading-tight">{value}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
          {trendPct !== undefined && <TrendBadge pct={trendPct} />}
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AnalyticsContent({ data }: { data: AnalyticsData }) {
  const {
    rangeDays, granularity,
    funnel, popularShops, zeroKeywords, suspiciousIps, inactiveShops,
    period, areaData, categoryData, funnelChartData, timeSeriesData,
    totalViews, totalActions, avgConv, totalShops,
  } = data;

  const dbConnected = funnel.length > 0 || zeroKeywords.length > 0 || timeSeriesData.length > 0;
  const trendSub    = `이전 ${rangeDays}일 대비`;
  const granLabel: Record<typeof granularity, string> = { day: "일별", week: "주별", month: "월별" };
  const timeSeriesTitle = `${granLabel[granularity]} 이벤트 추이`;

  return (
    <div className="space-y-5">
      {suspiciousIps.length > 0 && <AlertBanner ips={suspiciousIps} />}

      {!dbConnected && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3.5 text-sm">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>데이터베이스가 연결되지 않았습니다. Prisma 기반 지표는 DB 연결 후 표시됩니다.</span>
        </div>
      )}

      {/* 요약 카드 — 모바일 2열, 데스크탑 4열 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="전체 업소"
          value={totalShops.toLocaleString() + "개"}
          icon={Store}
          color="bg-blue-500"
        />
        <StatCard
          label={`${rangeDays}일 총 조회`}
          value={totalViews.toLocaleString()}
          sub={trendSub}
          icon={Activity}
          color="bg-indigo-500"
          trendPct={period?.changes.views}
        />
        <StatCard
          label="평균 전환율"
          value={`${avgConv}%`}
          sub={trendSub}
          icon={TrendingUp}
          color="bg-emerald-500"
          trendPct={period?.changes.conversionRate}
        />
        <StatCard
          label="미접속 업주"
          value={inactiveShops.length.toLocaleString() + "명"}
          icon={Clock}
          color="bg-rose-500"
        />
      </div>

      {/* 차트 그리드 — 모바일 1열, 데스크탑 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 시계열 차트: 데스크탑에서 전체 너비 */}
        <div className="lg:col-span-2">
          <Card title={timeSeriesTitle} icon={LineChart} accent="blue">
            <TimeSeriesChart data={timeSeriesData} granularity={granularity} />
          </Card>
        </div>

        {/* Sales Funnel: 데스크탑에서 전체 너비 */}
        <div className="lg:col-span-2">
          <Card title={`Sales Funnel — 업소별 조회 vs 행동 TOP 10 (${rangeDays}일)`} icon={TrendingUp} accent="blue">
            <FunnelChart data={funnelChartData} />
            {funnel.length > 0 && (
              <p className="mt-2 text-xs text-gray-400 text-right">
                전체 전환율 {totalActions.toLocaleString()} / {totalViews.toLocaleString()} ={" "}
                <strong className="text-gray-600">{avgConv}%</strong>
              </p>
            )}
          </Card>
        </div>

        {/* 지역 파이 + 카테고리 바: 나란히 (대칭) */}
        <Card title="지역별 업소 밀집도 TOP 10" icon={MapPin} accent="green">
          <AreaPieChart data={areaData} />
        </Card>

        <Card title={`카테고리별 활성도 TOP 5 (${rangeDays}일)`} icon={Tag} accent="purple">
          <CategoryChart data={categoryData} />
        </Card>

      </div>

      {/* 인기 업소 바 */}
      {popularShops.length > 0 && (
        <Card title={`인기 업소 TOP 10 — 최근 ${rangeDays}일`} icon={Activity} accent="purple">
          <div className="space-y-2">
            {popularShops.map((shop, i) => (
              <div key={shop.storeId} className="flex items-center gap-2 sm:gap-3 py-1">
                <span className={`text-xs font-bold w-4 sm:w-5 text-right shrink-0 ${i < 3 ? "text-yellow-500" : "text-gray-300"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 h-5 sm:h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                    style={{ width: `${Math.max(8, (shop.eventCount / (popularShops[0]?.eventCount || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 shrink-0 w-20 sm:w-28 text-right tabular-nums">
                  #{shop.storeId} · {shop.eventCount.toLocaleString()}회
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 테이블 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 장기 미접속 업주 */}
        <Card title="30일 미접속 업주" icon={Clock} accent="amber">
          {inactiveShops.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">미접속 업주가 없습니다</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs min-w-[260px]">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-2 text-left font-medium pl-1">업소명</th>
                    <th className="pb-2 text-right font-medium pr-1">마지막 접속</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inactiveShops.slice(0, 15).map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 text-gray-700 font-medium truncate max-w-[140px] sm:max-w-[200px] pl-1">
                        {shop.company}
                      </td>
                      <td className="py-2.5 text-right pr-1">
                        {shop.lastLoginAt ? (
                          <span className="text-orange-500">
                            {new Date(shop.lastLoginAt).toLocaleDateString("ko-KR")}
                          </span>
                        ) : (
                          <span className="text-red-400">미기록</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inactiveShops.length > 15 && (
                <p className="text-xs text-gray-400 mt-3 text-right pr-1">외 {inactiveShops.length - 15}명 더 있음</p>
              )}
            </div>
          )}
        </Card>

        {/* 수요 미충족 키워드 */}
        <Card title="수요 미충족 검색어 (결과 0건)" icon={Search} accent="purple">
          {zeroKeywords.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">미충족 키워드가 없습니다</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs min-w-[240px]">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-2 text-left font-medium pl-1">검색 키워드</th>
                    <th className="pb-2 text-right font-medium pr-1">검색 횟수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {zeroKeywords.map((kw) => (
                    <tr key={kw.keyword} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pl-1">
                        <span className="inline-block bg-purple-50 text-purple-700 rounded px-1.5 py-0.5 font-medium">
                          {kw.keyword}
                        </span>
                      </td>
                      <td className="py-2.5 text-right pr-1 tabular-nums">
                        <span className="font-semibold text-gray-800">{kw.count.toLocaleString()}</span>
                        <span className="text-gray-400 ml-0.5">회</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
