import Link from "next/link";
import { Search, Calendar, User, LogOut, LogIn, UserPlus, Store, Tag, Ticket, Shield, Lock } from "lucide-react";
import { auth } from "@/auth";
import { logoutAction } from "@/lib/actions/auth";
import { getUserById, getSettings } from "@/lib/data";
import { getSiteConfig } from "@/lib/siteConfig";
import UnreadMessageBadge from "./messages/UnreadMessageBadge";
import PointsBadge from "./PointsBadge";

export default async function Header() {
  const session  = await auth();
  const userId   = session?.user?.id ? parseInt(session.user.id) : null;
  const user     = userId ? await getUserById(userId) : null;
  const settings = getSettings();
  const config   = await getSiteConfig();

  // 업소 전용 비밀 게시판 — 마스터 스위치 ON + role(shop|admin) 둘 다 충족 시에만 노출
  const showShopCommunity =
    config.isShopCommunityActive &&
    !!user && (user.role === "shop" || user.role === "admin");

  return (
    <header className="bg-[#1a1a2e] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-yellow-400 shrink-0">
          BAM
        </Link>

        <form action="/" method="GET" className="flex-1 max-w-xl">
          <div className="relative">
            <input
              type="text"
              name="q"
              placeholder="업소명, 지역 검색..."
              className="w-full h-9 pl-3 pr-10 rounded-md bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-yellow-400"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-yellow-400">
              <Search size={16} />
            </button>
          </div>
        </form>

        <nav className="flex items-center gap-1 shrink-0">
          <Link href="/posts"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <Store size={14} />
            업소 게시글
          </Link>
          {settings.menuCouponVisible && (
            <Link href="/coupons"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <Tag size={14} />
              쿠폰
            </Link>
          )}
          {settings.menuEventVisible && (
            <Link href="/events"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <Ticket size={14} />
              이벤트
            </Link>
          )}
          <Link href="/attend"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <Calendar size={14} />
            출석부
          </Link>

          {session && user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 hover:text-white transition-colors">
                  <Shield size={14} />
                  Admin
                </Link>
              )}
              {user.role === "shop" && (
                <Link href="/shop/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <Store size={14} />
                  업소 관리
                </Link>
              )}
              {/* 업소 전용 비밀 게시판 — siteConfig.isShopCommunityActive && role(shop|admin) */}
              {showShopCommunity && (
                <Link href="/shop-community"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 hover:text-amber-100 transition-colors"
                  title="업소회원 전용 비밀 게시판">
                  <Lock size={13} />
                  업소 게시판
                </Link>
              )}
              <UnreadMessageBadge />
              <PointsBadge initial={user.points} />
              <Link href="/mypage"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <User size={14} />
                {session.user.name}
              </Link>
              <form action={logoutAction}>
                <button type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <LogOut size={14} />
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <LogIn size={14} />
                로그인
              </Link>
              <Link href="/register"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-black rounded-md text-xs font-semibold hover:bg-yellow-500 transition-colors">
                <UserPlus size={14} />
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
