"use client";

import { useState, useTransition } from "react";
import { Sparkles, AlertCircle, Calendar } from "lucide-react";
import { settleRankingAction } from "@/lib/actions/rankingReward";

type Result = { ok: true; periodKey: string; label: string; awarded: number[] } | { ok: false; error: string } | null;

export default function SettleButtons() {
  const [pending, startTrans] = useTransition();
  const [result, setResult] = useState<Result>(null);

  // custom 기간 입력 (기본: 최근 7일)
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [customStart, setCustomStart] = useState(lastWeek.toISOString().slice(0, 10));
  const [customEnd,   setCustomEnd]   = useState(today.toISOString().slice(0, 10));

  const settle = (
    periodType: "WEEKLY" | "MONTHLY" | "CUSTOM",
    mode: "balance" | "period",
    extra?: { customStart?: string; customEnd?: string },
  ) => {
    const label =
      periodType === "WEEKLY"  ? "주간 (지난 주)" :
      periodType === "MONTHLY" ? "월간 (지난 달)" :
                                 `커스텀 ${extra?.customStart} ~ ${extra?.customEnd}`;
    if (!confirm(`${label} 정산을 실행합니다.\n· 1위 50,000P / 2위 30,000P / 3위 10,000P 자동 지급\n· 칭호 자동 부여 + DM 발송\n계속할까요?`)) return;
    setResult(null);
    startTrans(async () => {
      const res = await settleRankingAction({ periodType, mode, ...extra });
      setResult(res);
    });
  };

  return (
    <div className="space-y-4">
      {/* 빠른 정산 (WEEKLY / MONTHLY) */}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => settle("WEEKLY", "period")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-500 shadow-sm transition-colors disabled:opacity-50">
          <Sparkles size={13} /> 주간 정산 (지난 주, 기간 획득)
        </button>
        <button type="button" disabled={pending} onClick={() => settle("MONTHLY", "period")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-500 shadow-sm transition-colors disabled:opacity-50">
          <Sparkles size={13} /> 월간 정산 (지난 달, 기간 획득)
        </button>
        <button type="button" disabled={pending} onClick={() => settle("MONTHLY", "balance")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-black shadow-sm transition-colors disabled:opacity-50">
          <Sparkles size={13} /> 월간 정산 (보유 잔액)
        </button>
      </div>

      {/* 커스텀 기간 정산 */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-[11px] text-gray-500 mb-2">
          <Calendar size={11} className="inline mr-1" />
          <strong>커스텀 기간 정산</strong> — 직접 시작/종료 날짜 선택 (기간 획득 모드 자동 적용)
        </p>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">시작일</label>
            <input type="date" value={customStart} max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)} disabled={pending}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400" />
          </div>
          <span className="text-gray-400 self-center pb-1">~</span>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">종료일</label>
            <input type="date" value={customEnd} min={customStart}
              onChange={(e) => setCustomEnd(e.target.value)} disabled={pending}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400" />
          </div>
          <button type="button" disabled={pending}
            onClick={() => settle("CUSTOM", "period", { customStart, customEnd })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 shadow-sm transition-colors disabled:opacity-50">
            <Sparkles size={13} /> 커스텀 정산
          </button>
        </div>
      </div>

      {pending && <p className="text-xs text-gray-500">정산 중... (보너스 지급 + 칭호 부여 + DM 발송)</p>}
      {result?.ok && (
        <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
          ✅ <strong>{result.label}</strong> 정산 완료 — {result.awarded.length}명 보상 지급 (periodKey: <code>{result.periodKey}</code>)
        </div>
      )}
      {result && !result.ok && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}
