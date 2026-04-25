"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

const POLL_MS = 30_000;   // 30초마다 갱신

/**
 * 헤더에 표시되는 안 읽은 쪽지 뱃지.
 * 1개 이상이면 빨간 ping 점 + "쪽지" 텍스트 + 카운트.
 * 0개면 아예 렌더하지 않음 (UI 깔끔하게).
 */
export default function UnreadMessageBadge() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/messages/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancel) setCount(json.count ?? 0);
      } catch { /* 네트워크 일시 오류 무시 */ }
    };
    fetchCount();
    const t = setInterval(fetchCount, POLL_MS);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/mypage/messages"
      title={`읽지 않은 쪽지 ${count}개`}
      className="relative inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-red-300 hover:text-red-200 hover:bg-white/10 transition-colors group"
    >
      {/* ping 빨간 점 */}
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
