"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { syncShopsFromJsonAction, type SyncResult } from "@/lib/actions/sync";

export default function QuickSyncButton() {
  const [pending, startTrans] = useTransition();
  const [result,  setResult]  = useState<SyncResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const router = useRouter();

  const run = () => {
    if (!confirm("scraped_data/shops.json 을 읽어 DB upsert 합니다. 30~60초 소요.")) return;
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
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-xs font-semibold hover:brightness-110 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
          {pending ? "동기화 진행 중..." : "전체 데이터 동기화 시작"}
        </button>
        <Link
          href="/admin/sync"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50"
        >
          상세 페이지
          <ExternalLink size={11} />
        </Link>
      </div>

      {pending && (
        <p className="mt-2 text-[11px] text-gray-500 animate-pulse">
          shops.json 읽는 중 → 100건 단위 upsert + 가상 user 자동 생성...
        </p>
      )}

      {error && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
          <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-700">{error}</p>
        </div>
      )}

      {result && result.ok && (
        <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-bold text-green-800 flex items-center gap-1">
            <CheckCircle2 size={12} /> 동기화 완료 ({(result.durationMs / 1000).toFixed(1)}초)
          </p>
          <p className="mt-1 text-[11px] text-green-700">
            전체 {result.total} · upsert {result.upserted}{" "}
            (신규 {result.created} / 갱신 {result.updated}) · 가상 user {result.virtualUsersCreated} 생성
          </p>
        </div>
      )}
    </div>
  );
}
