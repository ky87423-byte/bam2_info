"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, CheckCircle2, Circle, Shield, Store, Check } from "lucide-react";
import { deleteMessageAction, acknowledgeMessageAction } from "@/lib/actions/message";
import { notifyBadge } from "@/lib/useLiveBadge";

interface UserBrief {
  id: number;
  username: string;
  nickname: string;
  role: string;
}

interface Props {
  id: number;
  createdAt: string;
  sender: UserBrief;
  receiver: UserBrief;
  content: string;
  isRead: boolean;
  adminAcknowledgedAt: string | null;
}

export default function AdminMessageRow({ id, createdAt, sender, receiver, content, isRead, adminAcknowledgedAt }: Props) {
  const [pending, startTrans] = useTransition();
  const [acked,   setAcked]   = useState<boolean>(adminAcknowledgedAt !== null);

  // hydration mismatch 방지:
  //   SSR/첫 렌더 = ISO substring (timezone 무관, 항상 동일 출력)
  //   마운트 후    = ko-KR 로케일 포맷 (사용자 timezone 반영)
  const [dateText, setDateText] = useState<string>(() =>
    createdAt.slice(5, 16).replace("T", " ")  // "MM-DD HH:MM" (UTC, ISO 그대로)
  );
  useEffect(() => {
    setDateText(
      new Date(createdAt).toLocaleString("ko-KR", {
        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    );
  }, [createdAt]);

  const handleDelete = () => {
    if (!confirm(`쪽지 #${id}를 영구 삭제하시겠습니까?`)) return;
    startTrans(async () => { await deleteMessageAction(id); });
  };

  const handleAck = () => {
    if (acked) return;
    startTrans(async () => {
      const res = await acknowledgeMessageAction(id);
      if (res.ok) {
        setAcked(true);
        notifyBadge("admin:msg-ack");   // 사이드바 배지 즉시 재조회 → 1 차감 (cross-tab 포함)
      }
    });
  };

  return (
    <tr className={[
      pending ? "opacity-40" : "",
      !acked ? "bg-amber-50/40" : "",
    ].join(" ")}>
      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap tabular-nums">
        {dateText}
      </td>
      <td className="px-4 py-2.5 text-xs">
        <UserCell user={sender} />
      </td>
      <td className="px-4 py-2.5 text-xs">
        <UserCell user={receiver} />
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[280px]">
        <div className="line-clamp-2 break-words" title={content}>{content}</div>
      </td>
      <td className="px-4 py-2.5 text-center">
        {isRead
          ? <CheckCircle2 size={14} className="text-green-500 inline" />
          : <Circle       size={14} className="text-gray-300 inline" />}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={handleAck}
          disabled={pending || acked}
          title={acked ? "이미 확인됨" : "확인 처리 (사이드바 배지 1 차감)"}
          className={[
            "inline-flex items-center gap-1 px-2 py-1 rounded text-xs mr-1 transition-colors",
            acked
              ? "text-gray-400 cursor-default"
              : "text-blue-600 hover:bg-blue-50",
          ].join(" ")}
        >
          <Check size={11} />
          {acked ? "확인됨" : "확인"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50"
        >
          <Trash2 size={11} />
          삭제
        </button>
      </td>
    </tr>
  );
}

function UserCell({ user }: { user: UserBrief }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold text-gray-700">{user.nickname}</span>
      {user.role === "admin" && <Shield size={9} className="text-purple-500" />}
      {user.role === "shop"  && <Store  size={9} className="text-blue-500" />}
      <span className="text-gray-400 ml-0.5">@{user.username}</span>
    </div>
  );
}
