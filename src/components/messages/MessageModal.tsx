"use client";

import { useState, useTransition } from "react";
import { Send, MessageSquare, ShieldCheck } from "lucide-react";
import { sendMessageAction } from "@/lib/actions/message";
import { ModalShell } from "../users/ProfileModal";

interface Props {
  receiverId:       number;
  receiverNickname: string;
  onClose:          () => void;
  /** true 이면 모달 제목·안내가 "운영자 통한 문의" 톤으로 바뀜 */
  inquiryHint?:     boolean;
}

export default function MessageModal({ receiverId, receiverNickname, onClose, inquiryHint = false }: Props) {
  const [content,    setContent]    = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [successKind, setSuccessKind] = useState<"direct" | "inquiry" | null>(null);
  const [shopName,   setShopName]   = useState<string | null>(null);
  const [pending,    startTrans]    = useTransition();

  const submit = () => {
    setError(null);
    const text = content.trim();
    if (!text) { setError("내용을 입력하세요."); return; }
    startTrans(async () => {
      const res = await sendMessageAction({ receiverId, content: text });
      if (!res.ok) { setError(res.error); return; }
      setSuccessKind(res.data?.isInquiry ? "inquiry" : "direct");
      setShopName(res.data?.shopName ?? null);
      // 인콰이어리 우회는 안내가 길어서 자동 닫힘 시간 늘림
      setTimeout(onClose, res.data?.isInquiry ? 4000 : 1200);
    });
  };

  return (
    <ModalShell onClose={onClose} title={inquiryHint ? "운영자 통해 문의하기" : "쪽지 보내기"}>
      {successKind === "inquiry" ? (
        <div className="py-8 px-2 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 text-amber-600 rounded-full mb-4 shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1.5">관리자에게 문의가 접수됐습니다</p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
            <strong className="text-amber-700">{shopName ?? receiverNickname}</strong> 업소는 아직 회원으로 등록되지 않아<br />
            <strong>운영자가 검토 후 직접 연락</strong>해 드릴 예정입니다.
          </p>
          <p className="mt-3 text-[11px] text-gray-400">
            업주가 클레임 후엔 답장을 직접 받으실 수 있습니다.
          </p>
        </div>
      ) : successKind === "direct" ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-3">
            <Send size={20} />
          </div>
          <p className="text-sm font-semibold text-gray-700">쪽지를 보냈습니다!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiryHint && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 leading-relaxed">
              <ShieldCheck size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                이 업소는 아직 회원으로 등록되지 않았습니다. 메시지는{" "}
                <strong>운영자에게 먼저 전달된 후 업주에게 안내</strong>됩니다.
              </span>
            </div>
          )}

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
