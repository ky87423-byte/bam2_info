import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Trophy, Filter as FilterIcon, Sparkles, Gift } from "lucide-react";
import { getRankings } from "@/lib/actions/ranking";
import { getRewardHistory } from "@/lib/actions/rankingReward";
import { getSiteConfig } from "@/lib/siteConfig";
import RankingControls from "./RankingControls";
import ExcludedUsernamesForm from "./ExcludedUsernamesForm";
import SettleButtons from "./SettleButtons";
import RewardRow from "./RewardRow";

interface Props {
  searchParams: Promise<{ mode?: string; start?: string; end?: string }>;
}

export default async function AdminRankingsPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const params = await searchParams;
  const mode: "balance" | "period" = params.mode === "period" ? "period" : "balance";

  // 기본값: 최근 7일
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate = params.start ? new Date(params.start) : defaultStart;
  const endDate   = params.end   ? new Date(params.end)   : now;

  const rows = await getRankings(
    mode,
    mode === "period" ? startDate : undefined,
    mode === "period" ? endDate   : undefined,
    100,
  );

  const config = await getSiteConfig();
  const rewards = await getRewardHistory(30);

  // 캐시 안내용 시간
  const periodLabel = mode === "period"
    ? `${startDate.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}`
    : "전체 누적 잔액";

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={20} className="text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-800">포인트 랭킹</h2>
        <span className="text-xs text-gray-400 ml-2">상위 100명 · 캐시 1h</span>
      </div>

      {/* 컨트롤러 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <RankingControls
          mode={mode}
          startDate={startDate.toISOString().slice(0, 10)}
          endDate={endDate.toISOString().slice(0, 10)}
        />
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span><strong className="text-gray-700">{rows.length}명</strong> · {periodLabel}</span>
          <span>
            {mode === "balance" ? "현재 보유 포인트" : "기간 내 획득(+) 포인트 합계"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-center font-medium w-16">순위</th>
                <th className="px-4 py-2.5 text-left font-medium">닉네임</th>
                <th className="px-4 py-2.5 text-left font-medium">아이디</th>
                <th className="px-4 py-2.5 text-right font-medium">포인트</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-sm text-gray-400">
                    랭킹 대상이 없습니다.
                  </td>
                </tr>
              ) : rows.map((r) => {
                const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "";
                return (
                  <tr key={r.userId} className={r.rank <= 3 ? "bg-yellow-50/40" : ""}>
                    <td className="px-4 py-2.5 text-center font-bold tabular-nums">
                      {medal} {r.rank}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{r.nickname}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">@{r.username}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-yellow-600">
                      {r.points.toLocaleString()}P
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 정산 버튼 */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1.5">
          <Sparkles size={13} className="text-yellow-500" /> 랭킹 정산 — 1위 50,000P / 2위 30,000P / 3위 10,000P
        </h3>
        <p className="text-[11px] text-gray-400 mb-3">
          정산 시 TOP 3 에게: 보너스 포인트 자동 지급 + 칭호 부여 + 자동 쪽지 발송. 같은 기간 중복 정산 방지.
        </p>
        <SettleButtons />
      </div>

      {/* 보상 이력 */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Gift size={14} className="text-yellow-500" />
          <h3 className="font-semibold text-sm text-gray-700">보상 이력 (최근 30건)</h3>
          <span className="text-[10px] text-gray-400 ml-auto">{rewards.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">정산일</th>
                <th className="px-3 py-2 text-left font-medium">기간 키</th>
                <th className="px-3 py-2 text-center font-medium">순위</th>
                <th className="px-3 py-2 text-left font-medium">수상자</th>
                <th className="px-3 py-2 text-right font-medium">기록 / 보너스</th>
                <th className="px-3 py-2 text-center font-medium">DM</th>
                <th className="px-3 py-2 text-left font-medium">발송</th>
                <th className="px-3 py-2 text-left font-medium">메모</th>
                <th className="px-3 py-2 text-right font-medium">저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rewards.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-sm text-gray-400">아직 정산된 보상이 없습니다. 위쪽 정산 버튼으로 시작하세요.</td></tr>
              ) : rewards.map((r) => (
                <RewardRow key={r.id} reward={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 제외 username 편집 */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1.5">
          <FilterIcon size={13} className="text-gray-500" /> 랭킹 제외 username (테스트/운영 계정)
        </h3>
        <p className="text-[11px] text-gray-400 mb-3">
          ADMIN 역할 + 가상 계정은 자동 제외. 추가로 제외할 username 을 콤마로 구분해서 입력하세요.
        </p>
        <ExcludedUsernamesForm initial={config.rankingExcludedUsernames} />
      </div>
    </div>
  );
}
