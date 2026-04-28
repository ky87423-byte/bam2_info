"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, User, LogOut, LogIn, UserPlus, Store, Tag, Ticket, Shield, Lock,
  Menu, X, UserCircle, MessageSquare, Briefcase, ShieldCheck, ChevronDown, Users,
} from "lucide-react";
import UnreadMessageBadge from "./messages/UnreadMessageBadge";
import PointsBadge from "./PointsBadge";

// 커뮤니티 하위 메뉴 — 데스크톱 드롭다운 / 모바일 섹션
const COMMUNITY_ITEMS = [
  { href: "/free",      label: "자유게시판", icon: MessageSquare,
    desc: "닉네임으로 자유롭게" },
  { href: "/anonymous", label: "익명게시판", icon: UserCircle,
    desc: "익명으로 의견 교환" },
  { href: "/reviews",   label: "인증후기",   icon: ShieldCheck,
    desc: "실제 방문 인증 후기" },
  { href: "/jobs",      label: "구인구직",   icon: Briefcase,
    desc: "매장 채용 / 일자리" },
];

interface UserBrief {
  name?: string | null;
  role:  string;          // 'admin' | 'shop' | 'user'
  points: number;
}

interface Props {
  user: UserBrief | null;            // null = 비로그인
  showShopCommunity: boolean;
  menuCouponVisible: boolean;
  menuEventVisible:  boolean;
  logoutAction: () => Promise<void>;
}

/**
 * 헤더 우측 nav. md↑ 는 가로 펼침, md 미만은 햄버거 토글 drawer.
 * - 모바일에서 메뉴 클릭 시 자동 닫힘
 * - body scroll lock (drawer 열렸을 때)
 * - Esc 키 닫기
 */
export default function HeaderNav({ user, showShopCommunity, menuCouponVisible, menuEventVisible, logoutAction }: Props) {
  const [open, setOpen] = useState(false);

  // Esc 키 닫기 + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  // 메뉴 항목 — 데스크톱과 모바일 drawer 가 같은 데이터로 렌더
  // (모바일 drawer 에서는 hover 드롭다운 대신 inline 으로 펼쳐서 표시)
  const items = (
    <>
      <Link href="/posts" onClick={close} className={navLinkClass}>
        <Store size={14} /> 업소 게시글
      </Link>

      {/* 커뮤니티 — 데스크톱 hover 드롭다운 / 모바일 inline 섹션 */}
      <CommunityMenu close={close} />

      {menuCouponVisible && (
        <Link href="/coupons" onClick={close} className={navLinkClass}>
          <Tag size={14} /> 쿠폰
        </Link>
      )}
      {menuEventVisible && (
        <Link href="/events" onClick={close} className={navLinkClass}>
          <Ticket size={14} /> 이벤트
        </Link>
      )}
      <Link href="/attend" onClick={close} className={navLinkClass}>
        <Calendar size={14} /> 출석부
      </Link>

      {user ? (
        <>
          {user.role === "admin" && (
            <Link href="/admin" onClick={close} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 hover:text-white transition-colors">
              <Shield size={14} /> Admin
            </Link>
          )}
          {user.role === "shop" && (
            <Link href="/shop/dashboard" onClick={close} className={navLinkClass}>
              <Store size={14} /> 업소 관리
            </Link>
          )}
          {showShopCommunity && (
            <Link href="/shop-community" onClick={close} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 hover:text-amber-100 transition-colors">
              <Lock size={13} /> 업소 게시판
            </Link>
          )}
          <UnreadMessageBadge />
          <PointsBadge initial={user.points} />
          <Link href="/mypage" onClick={close} className={navLinkClass}>
            <User size={14} /> {user.name ?? "마이페이지"}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={navLinkClass} onClick={close}>
              <LogOut size={14} /> 로그아웃
            </button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" onClick={close} className={navLinkClass}>
            <LogIn size={14} /> 로그인
          </Link>
          <Link href="/register" onClick={close} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-black rounded-md text-xs font-semibold hover:bg-yellow-500 transition-colors">
            <UserPlus size={14} /> 회원가입
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      {/* 데스크톱 (lg↑) — 가로 펼침. md 이하는 nav 항목이 너무 많아 겹침 위험 → 햄버거로 통합 */}
      <nav className="hidden lg:flex items-center gap-1 shrink-0">
        {items}
      </nav>

      {/* 모바일 / 태블릿 햄버거 (lg 미만) — 미독 뱃지 + 햄버거 버튼만 */}
      <div className="lg:hidden flex items-center gap-1 shrink-0">
        {user && <UnreadMessageBadge />}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일 drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-14 bg-black/60 z-40"
            onClick={close}
          />
          <div className="lg:hidden fixed top-14 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 shadow-2xl z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="flex flex-col gap-1 p-3">
              {items}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const navLinkClass =
  "flex items-center gap-1.5 px-3 py-2 lg:py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors";

/**
 * 커뮤니티 메뉴 — 데스크톱은 hover 드롭다운, 모바일(<md) 은 클릭 토글 inline 섹션.
 * Tailwind group-hover + focus-within 으로 데스크톱에서 hover/키보드 둘 다 열림.
 */
function CommunityMenu({ close }: { close: () => void }) {
  const [expanded, setExpanded] = useState(false);  // 모바일 drawer 안 inline 펼침 상태

  return (
    <>
      {/* ── 데스크톱 (md↑) — hover 드롭다운 ── */}
      <div className="hidden lg:block relative group">
        <button
          type="button"
          className={`${navLinkClass} cursor-pointer`}
          aria-haspopup="menu"
          aria-expanded="false"
        >
          <Users size={14} /> 커뮤니티
          <ChevronDown size={11} className="opacity-60 group-hover:rotate-180 transition-transform" />
        </button>
        {/* 드롭다운 패널 — group-hover / focus-within 으로 확장 */}
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-60 bg-white rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-150 z-50"
        >
          <div className="py-1">
            {COMMUNITY_ITEMS.map(({ href, label, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-yellow-50 transition-colors group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover/item:bg-yellow-400 flex items-center justify-center transition-colors shrink-0">
                  <Icon size={14} className="text-gray-600 group-hover/item:text-black" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-800">{label}</div>
                  <div className="text-[10px] text-gray-400 truncate">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── 모바일 (<md) — drawer 안 inline 섹션 ── */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`${navLinkClass} w-full justify-between`}
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-1.5">
            <Users size={14} /> 커뮤니티
          </span>
          <ChevronDown size={11} className={`opacity-60 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="ml-2 mt-1 mb-1 pl-3 border-l border-white/10 flex flex-col gap-0.5">
            {COMMUNITY_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={close} className={navLinkClass}>
                <Icon size={13} /> {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
