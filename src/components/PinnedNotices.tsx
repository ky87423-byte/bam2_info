import { Pin } from "lucide-react";
import { getPinnedNoticesForBoard } from "@/lib/data";

/**
 * 게시판 상단 핀 공지 — 자유/구인구직 list 페이지에서 호출.
 * 노출 조건: NoticeData.isPinned + isVisible + boardCategory 일치.
 */
export default function PinnedNotices({ category }: { category: "free" | "jobs" }) {
  const notices = getPinnedNoticesForBoard(category);
  if (notices.length === 0) return null;

  return (
    <ul className="bg-yellow-50 border border-yellow-200 rounded-2xl shadow-sm divide-y divide-yellow-100 overflow-hidden mb-3">
      {notices.map((n) => (
        <li key={n.id} className="px-5 py-3.5">
          <div className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-400 text-black">
              <Pin size={9} /> 공지
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-yellow-900 text-sm">{n.title}</h3>
              <p className="text-xs text-yellow-800/80 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {n.content}
              </p>
              <p className="text-[10px] text-yellow-700/60 mt-1.5">{n.createdAt.slice(0, 10)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
