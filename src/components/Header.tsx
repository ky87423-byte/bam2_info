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
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3 md:gap-4">
        <Link href="/" className="text-xl font-bold text-yellow-400 shrink-0">
          BAM
        </Link>

        <form action="/" method="GET" className="flex-1 min-w-0 max-w-xl">
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
