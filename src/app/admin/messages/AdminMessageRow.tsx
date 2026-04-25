"use client";

import { useTransition } from "react";
import { Trash2, CheckCircle2, Circle, Shield, Store } from "lucide-react";
import { deleteMessageAction } from "@/lib/actions/message";

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
}

export default function AdminMessageRow({ id, createdAt, sender, receiver, content, isRead }: Props) {
  const [pending, startTrans] = useTransition();

  const handleDelete = () => {
    if (!confirm(`쪽지 #${id}를 영구 삭제하시겠습니까?`)) return;
    startTrans(async () => { await deleteMessageAction(id); });
  };

  return (
    <tr className={pending ? "opacity-40" : ""}>
      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap tabular-nums">
        {new Date(createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
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
      <td className="px-4 py-2.5 text-right">
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
