"use client";

import { useState, useTransition } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { markMessageReadAction, deleteMessageAction } from "@/lib/actions/message";
import { notifyBadge } from "@/lib/useLiveBadge";
import UserActionMenu from "@/components/users/UserActionMenu";

interface Counterpart {
  id:       number;
  username: string;
  nickname: string;
  role:     string;
}

interface Props {
  messageId:   number;
  folder:      "inbox" | "sent";
  counterpart: Counterpart;
  content:     string;
  isRead:      boolean;
  createdAt:   string;
  isReceiver:  boolean;
}

export default function MessageRow({
  messageId, folder, counterpart, content, isRead, createdAt, isReceiver,
}: Props) {
  const [open,    setOpen]    = useState(false);
  const [readOpt, setReadOpt] = useState(isRead);
  const [pending, startTrans] = useTransition();

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      // 받은 쪽지 + 처음 열 때만 읽음 처리
      if (next && isReceiver && !readOpt) {
        startTrans(async () => {
          await markMessageReadAction(messageId);
          setReadOpt(true);
          notifyBadge("unread-msg");  // 헤더 미독 배지 즉시 갱신
        });
      }
      return next;
    });
  };

  const handleDelete = () => {
    if (!confirm("쪽지를 삭제하시겠습니까?")) return;
    startTrans(async () => {
      await deleteMessageAction(messageId);
    });
  };

  return (
    <li className={[
      "p-4 hover:bg-gray-50 transition-colors",
      !readOpt && isReceiver ? "bg-amber-50/50" : "",
    ].join(" ")}>
      <div className="flex items-start gap-3">
        {/* 읽음 표시 */}
        <span className={[
          "w-2 h-2 rounded-full mt-2 shrink-0",
          isReceiver && !readOpt ? "bg-red-500" : "bg-gray-200",
        ].join(" ")} />

        <button
          type="button"
          onClick={toggleOpen}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-gray-400 shrink-0">
                {folder === "inbox" ? "from" : "to"}
              </span>
              <span className="text-sm font-semibold text-gray-800 truncate">
                {counterpart.nickname}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-gray-400">{formatDate(createdAt)}</span>
              {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
          </div>
          {!open && (
            <p className="mt-1 text-xs text-gray-500 truncate pl-12">
              {content.slice(0, 80)}{content.length > 80 ? "..." : ""}
            </p>
          )}
        </button>
      </div>

      {open && (
        <div className="mt-3 pl-5 space-y-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-white rounded-lg p-3 ring-1 ring-gray-100">
            {content}
          </p>
          <div className="flex items-center justify-between text-xs">
            <UserActionMenu
              userId={counterpart.id}
              username={counterpart.username}
              nickname={counterpart.nickname}
              role={counterpart.role.toLowerCase()}
              className="text-indigo-600"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={11} />
              삭제
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1)  return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return d.toLocaleDateString("ko-KR");
}
