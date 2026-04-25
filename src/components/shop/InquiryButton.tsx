"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import MessageModal from "../messages/MessageModal";

interface Props {
  shopId:  number;
  company: string;
}

/**
 * /shop/[id] 페이지에서 "운영자 통한 문의" 버튼.
 * 클릭 시:
 *   1. /api/shops/[id]/virtual-user POST → 가상 user lazy 생성, userId 반환
 *   2. MessageModal 을 inquiryHint=true 로 띄움
 *   3. 발송하면 서버 액션이 자동 우회 → AdminInquiry 저장
 */
export default function InquiryButton({ shopId, company }: Props) {
  const [virtualUserId, setVirtualUserId] = useState<number | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [pending,       startTrans]       = useTransition();

  const open = () => {
    setError(null);
    startTrans(async () => {
      try {
        const res = await fetch(`/api/shops/${shopId}/virtual-user`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.userId) throw new Error("userId missing");
        setVirtualUserId(json.userId);
      } catch (e) {
        setError("문의 창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.");
        console.error("[InquiryButton]", e);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50"
      >
        <Mail size={13} />
        {pending ? "..." : "운영자 통해 문의"}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}

      {virtualUserId !== null && (
        <MessageModal
          receiverId={virtualUserId}
          receiverNickname={company}
          inquiryHint={true}
          onClose={() => setVirtualUserId(null)}
        />
      )}
    </>
  );
}
