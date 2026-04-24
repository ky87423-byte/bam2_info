import Link from "next/link";
import { auth, signOut } from "@/auth";
import {
  LayoutDashboard, FileText, PlusCircle,
  Home, Shield, LogOut,
} from "lucide-react";

const navItems = [
  { href: "/shop/dashboard", label: "대시보드",       icon: LayoutDashboard },
  { href: "/shop/dashboard", label: "내 업소 게시글",  icon: FileText        },
  { href: "/shop/post/new",  label: "새 게시글 작성",  icon: PlusCircle      },
];

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const name = session?.user?.name;

  const roleLabel = role === "admin" ? "관리자" : "업소회원";
  const roleBadgeClass = role === "admin"
    ? "bg-purple-50 text-purple-700 border-purple-200"
    : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* ── 좌측 사이드바 ── */}
      <aside className="w-56 shrink-0 bg-[#1a1a2e] text-white flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-yellow-400 font-bold text-lg tracking-wide">BAM 업소관리</span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }, i) => (
            <Link
              key={i}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
            </Link>
          ))}
        </nav>

        {/* 하단: 메인 사이트 / 관리자 페이지 이동 */}
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Home size={16} />
            메인 사이트
          </Link>
          {role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Shield size={16} />
              관리자 페이지
            </Link>
          )}
        </div>
      </aside>

      {/* ── 본문 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
          <h1 className="text-sm font-semibold text-gray-600">업소 관리</h1>
          <div className="flex items-center gap-3">
            {/* 권한 뱃지 */}
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${roleBadgeClass}`}>
              <Shield size={11} />
              {roleLabel}
            </span>
            {name && <span className="text-xs text-gray-500">{name}</span>}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50"
              >
                <LogOut size={11} />
                로그아웃
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
