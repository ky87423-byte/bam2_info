"use client";

import { useEffect, useState } from "react";
import { X, User as UserIcon, Calendar, Award, Shield, Store } from "lucide-react";

interface PublicProfile {
  id:        number;
  nickname:  string;
  username:  string;
  role:      string;
  level:     number;
  joinedAt:  string;
}

interface Props {
  userId:  number;
  onClose: () => void;
}

export default function ProfileModal({ userId, onClose }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/users/${userId}/profile`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => { if (!cancel) setProfile(data); })
      .catch(() => { if (!cancel) setError(true); });
    return () => { cancel = true; };
  }, [userId]);

  return (
    <ModalShell onClose={onClose} title="자기소개">
      {error ? (
        <p className="text-sm text-red-500 text-center py-8">프로필을 불러오지 못했습니다.</p>
      ) : !profile ? (
        <div className="py-12 text-center text-sm text-gray-400 animate-pulse">불러오는 중...</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className={[
              "w-12 h-12 rounded-full flex items-center justify-center text-base font-bold",
              profile.role === "admin" ? "bg-purple-100 text-purple-700"
              : profile.role === "shop" ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600",
            ].join(" ")}>
              {profile.nickname.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-800">{profile.nickname}</h3>
                {profile.role === "admin" && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold">
                    <Shield size={9} /> 관리자
                  </span>
                )}
                {profile.role === "shop" && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">
                    <Store size={9} /> 업소
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">@{profile.username}</p>
            </div>
          </div>
          <ProfileRow icon={Award}    label="레벨"     value={`Lv. ${profile.level}`} />
          <ProfileRow icon={Calendar} label="가입일"   value={profile.joinedAt} />
          <ProfileRow icon={UserIcon} label="회원유형" value={
            profile.role === "admin" ? "관리자" : profile.role === "shop" ? "업소회원" : "일반회원"
          } />
        </div>
      )}
    </ModalShell>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-gray-500">
        <Icon size={13} />
        {label}
      </span>
      <span className="font-semibold text-gray-700">{value}</span>
    </div>
  );
}

// ── 공용 모달 셸 (백드롭 + 닫기 버튼) ─────────────────────────────────────
export function ModalShell({
  children, onClose, title,
}: {
  children: React.ReactNode; onClose: () => void; title: string;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
