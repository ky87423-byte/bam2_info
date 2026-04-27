"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, Wallet, TrendingUp } from "lucide-react";

interface Props {
  mode:      "balance" | "period";
  startDate: string;     // YYYY-MM-DD
  endDate:   string;
}

const QUICK_RANGES = [
  { label: "1일",  days: 1   },
  { label: "7일",  days: 7   },
  { label: "15일", days: 15  },
  { label: "1개월", days: 30 },
];

export default function RankingControls({ mode: initialMode, startDate: initStart, endDate: initEnd }: Props) {
  const router = useRouter();
  const [mode, setMode]   = useState<"balance" | "period">(initialMode);
  const [start, setStart] = useState(initStart);
  const [end,   setEnd]   = useState(initEnd);

  const apply = (overrides: Partial<{ mode: "balance" | "period"; start: string; end: string }> = {}) => {
    const m = overrides.mode  ?? mode;
    const s = overrides.start ?? start;
    const e = overrides.end   ?? end;
    const sp = new URLSearchParams();
    sp.set("mode", m);
    if (m === "period") {
      sp.set("start", s);
      sp.set("end",   e);
    }
    router.push(`/admin/rankings?${sp.toString()}`);
  };

  const setQuickRange = (days: number) => {
    const today = new Date();
    const past  = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const e = today.toISOString().slice(0, 10);
    const s = past.toISOString().slice(0, 10);
    setStart(s); setEnd(e); setMode("period");
    apply({ mode: "period", start: s, end: e });
  };

  return (
    <div className="space-y-4">
      {/* 모드 라디오 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">집계 기준</label>
        <div className="inline-flex bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setMode("balance"); apply({ mode: "balance" }); }}
            className={[
              "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
              mode === "balance" ? "bg-white text-yellow-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            <Wallet size={12} /> 보유 포인트 (잔액)
          </button>
          <button
            type="button"
            onClick={() => { setMode("period"); apply({ mode: "period", start, end }); }}
            className={[
              "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
              mode === "period" ? "bg-white text-yellow-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            <TrendingUp size={12} /> 기간 획득 포인트
          </button>
        </div>
      </div>

      {/* 기간 (period 모드만) */}
      {mode === "period" && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">빠른 선택</label>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  onClick={() => setQuickRange(r.days)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                <Calendar size={11} className="inline mr-1" /> 시작일
              </label>
              <input
                type="date"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                <Calendar size={11} className="inline mr-1" /> 종료일
              </label>
              <input
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
            <button
              type="button"
              onClick={() => apply()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-yellow-400 text-black hover:bg-yellow-500 shadow-sm transition-colors"
            >
              조회
            </button>
          </div>
        </>
      )}
    </div>
  );
}
