"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, MessageSquare, Search, X, Shield, Store } from "lucide-react";
import ProfileModal from "./ProfileModal";
import MessageModal from "../messages/MessageModal";

interface Props {
  userId:    number;
  username:  string;       // /posts?author=username 검색용
  nickname:  string;
  role?:     string;       // 'admin' | 'shop' | 'user'
  title?:    string | null;  // 랭킹 보상 칭호 (예: "🥇 2026-04 월간 1위")
  className?: string;
}

/**
 * 닉네임을 클릭하면 팝오버 메뉴가 떠서 [자기소개 / 쪽지보내기 / 게시글검색] 액션 제공.
 * 게시글·댓글 등 닉네임이 노출되는 모든 곳에서 동일하게 사용 가능.
 */
export default function UserActionMenu({ userId, username, nickname, role, title, className }: Props) {
  const [open,    setOpen]    = useState(false);
  const [profile, setProfile] = useState(false);
  const [message, setMessage] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const router  = useRouter();

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const goSearch = () => {
    setOpen(false);
    router.push(`/posts?author=${encodeURIComponent(username)}`);
  };

  return (
    <>
      <span ref={wrapRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={[
            "inline-flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-200 rounded transition-colors",
            className ?? "",
          ].join(" ")}
        >
          {nickname}
          {role === "admin" && <Shield size={9} className="text-purple-500" />}
          {role === "shop"  && <Store  size={9} className="text-blue-500" />}
          {title && (
            <span
              title={title}
              className="ml-1 inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-900 shadow-sm whitespace-nowrap"
            >
              {title}
            </span>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute z-50 left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg ring-1 ring-black/5 py-1 text-sm overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate">{nickname}</span>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500">
                <X size={12} />
              </button>
            </div>
            <MenuButton icon={UserIcon}      label="자기소개"  onClick={() => { setOpen(false); setProfile(true); }} />
            <MenuButton icon={MessageSquare} label="쪽지보내기" onClick={() => { setOpen(false); setMessage(true); }} />
            <MenuButton icon={Search}        label="게시글검색" onClick={goSearch} />
          </div>
        )}
      </span>

      {profile && (
        <ProfileModal userId={userId} onClose={() => setProfile(false)} />
      )}
      {message && (
        <MessageModal
          receiverId={userId}
          receiverNickname={nickname}
          onClose={() => setMessage(false)}
        />
      )}
    </>
  );
}

function MenuButton({
  icon: Icon, label, onClick,
}: {
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
    >
      <Icon size={13} className="text-gray-400" />
      <span className="text-gray-700">{label}</span>
    </button>
  );
}
