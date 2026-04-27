"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, User, LogOut, LogIn, UserPlus, Store, Tag, Ticket, Shield, Lock, Menu, X, UserCircle } from "lucide-react";
import UnreadMessageBadge from "./messages/UnreadMessageBadge";
import PointsBadge from "./PointsBadge";

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
  const items = (
    <>
      <Link href="/posts" onClick={close} className={navLinkClass}>
        <Store size={14} /> 업소 게시글
      </Link>
      <Link href="/anonymous" onClick={close} className={navLinkClass}>
        <UserCircle size={14} /> 익명게시판
      </Link>
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
      {/* 데스크톱 (md↑) — 가로 펼침 */}
      <nav className="hidden md:flex items-center gap-1 shrink-0">
        {items}
      </nav>

      {/* 모바일 햄버거 (md 미만) — 미독 뱃지 + 햄버거 버튼만 */}
      <div className="md:hidden flex items-center gap-1 shrink-0">
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
            className="md:hidden fixed inset-0 top-14 bg-black/60 z-40"
            onClick={close}
          />
          <div className="md:hidden fixed top-14 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 shadow-2xl z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
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
  "flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors";
