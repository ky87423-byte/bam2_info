"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { bulkMarkMissingAsDeleted } from "@/lib/actions/source-status";

export default function BulkMarkButton({ currentCount }: { currentCount: number }) {
  const [pending, startTrans] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const run = () => {
    if (!confirm(`MISSING 상태 ${currentCount}건을 전부 DELETED_CONFIRMED로 전환합니다.\n\n⚠️ 검증 없이 강제 전환이므로 false positive(살아 있는 글)도 숨겨질 수 있습니다. 진행할까요?`)) return;
    setResult(null);
    startTrans(async () => {
      const r = await bulkMarkMissingAsDeleted();
      if (!r.ok) { alert(r.error); return; }
      setResult(`${r.count}건 전환 완료`);
      router.refresh();
    });
  };

  if (currentCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-xs text-green-700 font-semibold">{result}</span>}
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-40"
      >
        <Trash2 size={13} />
        {pending ? "전환 중..." : "MISSING 전부 DELETED 처리"}
      </button>
    </div>
  );
}
