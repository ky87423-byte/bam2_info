import Link from "next/link";
import { Search } from "lucide-react";
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
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3 lg:gap-4">
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

        {/* 퀵 버튼 — 쿠폰수령만 (인증후기는 커뮤니티 드롭다운으로 이동) */}
        <Link
          href="/coupons"
          aria-label="쿠폰"
          className="hidden sm:inline-flex items-center h-8 px-2.5 rounded-md bg-yellow-400 text-[#1a1a2e] text-[11px] font-semibold shadow-sm hover:bg-yellow-300 transition-colors whitespace-nowrap shrink-0"
        >
          🎟️ 쿠폰
        </Link>

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
