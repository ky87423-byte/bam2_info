import { Trophy, Crown, Medal } from "lucide-react";
import { getRankings } from "@/lib/actions/ranking";

/**
 * 메인 페이지 명예의 전당 위젯 — TOP 10 (보유 포인트 잔액 기준).
 * BAM 블랙·옐로우 테마.
 *  1위 = 금메달 + crown 배경 강조
 *  2-3위 = 은/동 메달
 *  4-10위 = 일반 list
 */
export default async function RankingWidget() {
  const rows = await getRankings("balance", undefined, undefined, 10);
  if (rows.length === 0) return null;

  return (
    <section className="bg-[#1a1a2e] text-white rounded-2xl shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
        <Trophy size={16} className="text-yellow-400" />
        <h3 className="font-bold text-sm tracking-wide">명예의 전당 <span className="text-yellow-400">TOP {rows.length}</span></h3>
        <span className="ml-auto text-[10px] text-white/40">보유 포인트 기준</span>
      </div>

      {/* 1-3위 podium */}
      <div className="grid grid-cols-3 gap-2 p-4 bg-gradient-to-b from-yellow-400/5 to-transparent">
        {[2, 1, 3].map((targetRank) => {
          const row = rows.find((r) => r.rank === targetRank);
          if (!row) return <div key={targetRank} />;
          const config =
            targetRank === 1 ? { medal: "🥇", color: "from-yellow-400 to-amber-500", border: "border-yellow-400", text: "text-yellow-400", scale: "scale-105" }
            : targetRank === 2 ? { medal: "🥈", color: "from-gray-300 to-gray-400", border: "border-gray-300", text: "text-gray-300", scale: "" }
            : { medal: "🥉", color: "from-amber-700 to-amber-800", border: "border-amber-700", text: "text-amber-500", scale: "" };
          return (
            <div key={row.userId} className={["relative flex flex-col items-center gap-1 transition-transform", config.scale].join(" ")}>
              {targetRank === 1 && (
                <Crown size={14} className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
              )}
              <div className={["w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-xl shadow-lg", config.color].join(" ")}>
                {config.medal}
              </div>
              <span className={["text-xs font-bold truncate max-w-full", config.text].join(" ")}>{row.nickname}</span>
              <span className="text-[10px] text-white/60 tabular-nums">{row.points.toLocaleString()}P</span>
            </div>
          );
        })}
      </div>

      {/* 4-10위 list */}
      {rows.length > 3 && (
        <ul className="divide-y divide-white/5">
          {rows.filter((r) => r.rank >= 4 && r.rank <= 10).map((r) => (
            <li key={r.userId} className="flex items-center gap-3 px-5 py-2 hover:bg-white/5 transition-colors">
              <span className="w-6 text-center text-xs font-bold text-white/50 tabular-nums">{r.rank}</span>
              <Medal size={11} className="text-white/30" />
              <span className="flex-1 text-xs font-semibold text-white/80 truncate flex items-center gap-1">
                {r.nickname}
                {r.title && (
                  <span className="text-[8px] px-1 py-px rounded-full bg-yellow-400/20 text-yellow-300 font-bold whitespace-nowrap" title={r.title}>
                    {r.title.split(" ")[0] /* 메달 이모지만 컴팩트 표시 */}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-yellow-400 font-bold tabular-nums">{r.points.toLocaleString()}P</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
