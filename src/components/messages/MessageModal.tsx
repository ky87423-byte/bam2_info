"use client";

import { useState, useTransition } from "react";
import { Send, MessageSquare } from "lucide-react";
import { sendMessageAction } from "@/lib/actions/message";
import { ModalShell } from "../users/ProfileModal";

interface Props {
  receiverId:       number;
  receiverNickname: string;
  onClose:          () => void;
}

export default function MessageModal({ receiverId, receiverNickname, onClose }: Props) {
  const [content, setContent] = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTrans] = useTransition();

  const submit = () => {
    setError(null);
    const text = content.trim();
    if (!text) { setError("내용을 입력하세요."); return; }
    startTrans(async () => {
      const res = await sendMessageAction({ receiverId, content: text });
      if (!res.ok) { setError(res.error); return; }
      setSuccess(true);
      setTimeout(onClose, 1200);
    });
  };

  return (
    <ModalShell onClose={onClose} title="쪽지 보내기">
      {success ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-3">
            <Send size={20} />
          </div>
          <p className="text-sm font-semibold text-gray-700">쪽지를 보냈습니다!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 받는 사람 (자동 지정, 읽기 전용) */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">받는 사람</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl">
              <MessageSquare size={14} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-800">{receiverNickname}</span>
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="쪽지 내용을 입력하세요..."
              autoFocus
              disabled={pending}
              maxLength={2000}
              rows={6}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-gray-50"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
            />
            <p className="mt-1 text-[10px] text-gray-400 text-right">
              {content.length} / 2000 · ⌘/Ctrl + Enter 로 전송
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-4 py-2 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !content.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-40"
            >
              <Send size={13} />
              {pending ? "보내는 중..." : "쪽지 보내기"}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
