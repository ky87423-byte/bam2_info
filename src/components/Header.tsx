import Link from "next/link";
import { Search, Ticket, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { logoutAction } from "@/lib/actions/auth";
import { getUserById, getSettings } from "@/lib/data";
import { getSiteConfig } from "@/lib/siteConfig";
import HeaderNav from "./HeaderNav";

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
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3 md:gap-4">
        <Link href="/" className="text-xl font-bold text-yellow-400 shrink-0">
          BAM
        </Link>

        {/* 검색창 — 검색창을 우측에서 약 20% 축소 (max-w-md → max-w-sm) */}
        <form action="/" method="GET" className="flex-1 min-w-0 max-w-sm">
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

        {/* 빠른 액션 2종 — 노란/오렌지 그라데이션, sm 이상에서만 노출 (모바일은 햄버거 메뉴에 들어감) */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <Link
            href="/coupons"
            aria-label="쿠폰 수령"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-gradient-to-r from-yellow-400 to-orange-500 text-[#1a1a2e] text-xs font-bold shadow-md hover:shadow-lg hover:from-yellow-300 hover:to-orange-400 transition-all ring-1 ring-yellow-300/40"
          >
            <Ticket size={14} className="shrink-0" />
            <span className="whitespace-nowrap">🎟️ 쿠폰수령</span>
          </Link>
          <Link
            href="/reviews"
            aria-label="인증 후기 게시판"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-md hover:shadow-lg hover:from-orange-400 hover:to-red-400 transition-all ring-1 ring-orange-400/40"
          >
            <ShieldCheck size={14} className="shrink-0" />
            <span className="whitespace-nowrap">📝 인증후기</span>
          </Link>
        </div>

        <HeaderNav
          user={user ? {
            name: session?.user?.name,
            role: user.role ?? "user",
            points: user.points,
          } : null}
          showShopCommunity={showShopCommunity}
          menuCouponVisible={settings.menuCouponVisible}
          menuEventVisible={settings.menuEventVisible}
          logoutAction={logoutAction}
        />
      </div>
    </header>
  );
}
