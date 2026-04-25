"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { adminSendMessageAction } from "@/lib/actions/message";

interface UserOption {
  id:       number;
  username: string;
  nickname: string;
  role:     string;
}

interface Props {
  users: UserOption[];
}

export default function AdminSendForm({ users }: Props) {
  const [receiverId, setReceiverId] = useState<number | "">("");
  const [content,    setContent]    = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [okMsg,      setOkMsg]      = useState<string | null>(null);
  const [pending,    startTrans]    = useTransition();

  const submit = () => {
    setError(null); setOkMsg(null);
    if (!receiverId || typeof receiverId !== "number") { setError("받는 사람을 선택하세요."); return; }
    const text = content.trim();
    if (!text) { setError("내용을 입력하세요."); return; }
    startTrans(async () => {
      const res = await adminSendMessageAction({ receiverId, content: text });
      if (!res.ok) { setError(res.error); return; }
      setOkMsg("쪽지를 보냈습니다.");
      setContent("");
      setTimeout(() => setOkMsg(null), 2500);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value ? parseInt(e.target.value, 10) : "")}
          disabled={pending}
          className="sm:w-60 h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-gray-50"
        >
          <option value="">받는 사람 선택...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nickname} (@{u.username}) {u.role === "admin" ? "· 관리자" : u.role === "shop" ? "· 업소" : ""}
            </option>
          ))}
        </select>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="관리자 명의로 보낼 쪽지 내용..."
          disabled={pending}
          maxLength={2000}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !receiverId || !content.trim()}
          className="self-stretch sm:self-end inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-40"
        >
          <Send size={13} />
          {pending ? "..." : "발송"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {okMsg && <p className="text-xs text-green-600">{okMsg}</p>}
    </div>
  );
}
