"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { saveRankingExcludedAction } from "./actions";

export default function ExcludedUsernamesForm({ initial }: { initial: string[] }) {
  const [text, setText] = useState(initial.join(", "));
  const [pending, startTrans] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const submit = () => {
    const list = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    startTrans(async () => {
      await saveRankingExcludedAction(list);
      setSavedAt(Date.now());
    });
  };

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="_dev_user, test1, ..."
        disabled={pending}
        className="flex-1 min-w-[260px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-white hover:bg-black shadow-sm transition-colors disabled:opacity-40"
      >
        <Save size={12} /> {pending ? "저장 중..." : "저장"}
      </button>
      {savedAt && (
        <span className="text-[11px] text-green-600">저장됨 — 캐시 즉시 무효화</span>
      )}
    </div>
  );
}
