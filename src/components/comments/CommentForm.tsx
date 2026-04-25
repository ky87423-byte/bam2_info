"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { createCommentAction } from "@/lib/actions/comment";

interface Props {
  boardType: string;
  postId:    number;
  parentId?: number;            // 답글일 때
  onDone?:   () => void;        // 답글 폼 닫기 등
  autoFocus?: boolean;
  placeholder?: string;
}

export default function CommentForm({
  boardType, postId, parentId, onDone,
  autoFocus = false,
  placeholder = "댓글을 입력하세요...",
}: Props) {
  const [content,   setContent]   = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [winFlash,  setWinFlash]  = useState<number | null>(null);
  const [pending,   startTrans]   = useTransition();

  const submit = () => {
    setError(null);
    const text = content.trim();
    if (!text) { setError("댓글 내용을 입력하세요."); return; }
    startTrans(async () => {
      const res = await createCommentAction({
        targetType: boardType,
        targetId:   postId,
        content:    text,
        parentId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setContent("");
      if (res.isLuckyWin) {
        setWinFlash(res.luckyAmount);
        setTimeout(() => setWinFlash(null), 4000);
      }
      onDone?.();
    });
  };

  return (
    <div className="space-y-2">
      {winFlash !== null && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 border border-amber-300 text-amber-900 text-sm font-semibold shadow-sm animate-pulse">
          <Sparkles size={16} className="text-amber-500" />
          🎉 행운 당첨! <span className="text-amber-700">+{winFlash}P</span> 적립되었습니다.
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={pending}
          maxLength={2000}
          rows={parentId ? 2 : 3}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-gray-50"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !content.trim()}
          className="self-end shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={13} />
          {pending ? "등록 중..." : parentId ? "답글" : "등록"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 px-1">{error}</p>}
      <p className="text-[10px] text-gray-400 text-right pr-1">
        {content.length} / 2000 · ⌘/Ctrl + Enter 로 빠른 등록
      </p>
    </div>
  );
}
