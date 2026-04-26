"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useLiveBadge } from "@/lib/useLiveBadge";

/**
 * 헤더 미독 쪽지 뱃지.
 *  - count 0 면 렌더하지 않음 (UI 깔끔)
 *  - useLiveBadge 로 polling + focus + cross-tab 통합
 *  - 채널: "unread-msg" — 사용자가 쪽지 읽으면 MessageRow 가 notifyBadge("unread-msg") 호출
 */
export default function UnreadMessageBadge() {
  const { count } = useLiveBadge({
    initial:  0,
    fetchUrl: "/api/messages/unread-count",
    channel:  "unread-msg",
  });

  if (count === 0) return null;

  return (
    <Link
      href="/mypage/messages"
      title={`읽지 않은 쪽지 ${count}개`}
      className="relative inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-red-300 hover:text-red-200 hover:bg-white/10 transition-colors group"
    >
      <span className="relative flex h-2 w-2 mr-0.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <Mail size={13} className="text-red-300 group-hover:text-red-200" />
      <span className="font-semibold">쪽지</span>
      <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none min-w-[16px] text-center">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}
