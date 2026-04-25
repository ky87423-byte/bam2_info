"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { syncShopsFromJsonAction, type SyncResult } from "@/lib/actions/sync";

export default function SyncRunButton() {
  const [pending, startTrans] = useTransition();
  const [result,  setResult]  = useState<SyncResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const router = useRouter();

  const run = () => {
    if (!confirm("scraped_data/shops.json 을 읽어 DB에 upsert 합니다. 30~60초 소요. 진행할까요?")) return;
    setError(null); setResult(null);
    startTrans(async () => {
      const res = await syncShopsFromJsonAction();
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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold hover:brightness-110 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
        {pending ? "동기화 진행 중..." : "전체 동기화 실행"}
      </button>

      {pending && (
        <p className="mt-3 text-xs text-gray-500 animate-pulse">
          shops.json 읽는 중 → 100건 단위로 upsert + 가상 user 자동 생성...
        </p>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {result && result.ok && (
        <div className="mt-4 px-5 py-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-bold text-green-800 flex items-center gap-1.5 mb-3">
            <CheckCircle2 size={14} className="text-green-600" />
            동기화 완료 ({(result.durationMs / 1000).toFixed(1)}초 소요)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <Stat label="전체 row"    value={result.total} />
            <Stat label="upsert"     value={result.upserted} highlight />
            <Stat label="신규 생성"   value={result.created} color="text-blue-600" />
            <Stat label="기존 갱신"   value={result.updated} color="text-amber-600" />
            <Stat label="스킵"       value={result.skipped} color="text-gray-400" />
            <Stat label="가상 user 신규" value={result.virtualUsersCreated} color="text-purple-600" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight, color }: {
  label: string; value: number; highlight?: boolean; color?: string;
}) {
  return (
    <div className={[
      "bg-white rounded-lg px-3 py-2 ring-1",
      highlight ? "ring-green-300" : "ring-gray-100",
    ].join(" ")}>
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={["text-base font-bold tabular-nums", color ?? "text-gray-700"].join(" ")}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
