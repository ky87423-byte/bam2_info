"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { syncListVisibilityAction, type VisibilitySyncResult } from "@/lib/actions/sync";

export default function VisibilitySyncButton() {
  const [pending, startTrans] = useTransition();
  const [result,  setResult]  = useState<VisibilitySyncResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const router = useRouter();

  const run = () => {
    if (!confirm("urls.json 을 읽어 소스 사이트의 현재 목록과 DB를 대조합니다. 진행할까요?")) return;
    setError(null); setResult(null);
    startTrans(async () => {
      const res = await syncListVisibilityAction();
      if (!res.ok) { setError(res.error); return; }
      setResult(res);
      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:brightness-110 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Eye size={14} className={pending ? "animate-pulse" : ""} />
        {pending ? "가시성 동기화 중..." : "가시성 동기화 실행"}
      </button>

      {pending && (
        <p className="mt-3 text-xs text-gray-500 animate-pulse">
          현재 목록(urls.json) ↔ DB 대조 중 → ACTIVE/MISSING/ARCHIVED 상태 갱신...
        </p>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {result && result.ok && (
        <div className="mt-4 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5 mb-3">
            <CheckCircle2 size={14} className="text-amber-600" />
            가시성 동기화 완료 ({(result.durationMs / 1000).toFixed(1)}초 소요)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label="현재 목록 수"   value={result.listedCount} />
            <Stat label="ACTIVE 갱신"  value={result.seenUpdated}      color="text-green-600" />
            <Stat label="MISSING +1"   value={result.missingIncreased} color="text-amber-600" />
            <Stat label="ARCHIVED 전환" value={result.archived}         color="text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: {
  label: string; value: number; color?: string;
}) {
  return (
    <div className="bg-white rounded-lg px-3 py-2 ring-1 ring-gray-100">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={["text-base font-bold tabular-nums", color ?? "text-gray-700"].join(" ")}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
