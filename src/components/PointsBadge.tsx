"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import { useLiveBadge } from "@/lib/useLiveBadge";

/**
 * 헤더 포인트 표시 (라이브).
 *  - 출석/게시글/댓글 등 액션 후 notifyBadge("points") 로 즉시 갱신
 *  - 채널: "points"
 */
export default function PointsBadge({ initial }: { initial: number }) {
  const { count } = useLiveBadge({
    initial,
    fetchUrl: "/api/me/points",
    channel:  "points",
  });

  return (
    <Link
      href="/mypage"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      <Coins size={13} className="text-yellow-400" />
      <span className="text-yellow-400 font-semibold tabular-nums">{count.toLocaleString()}P</span>
    </Link>
  );
}
