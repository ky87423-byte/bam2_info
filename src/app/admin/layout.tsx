import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getShopPosts } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import {
  LayoutDashboard, Store, Users, Tag, MessageSquare, Mail, Inbox, ShieldCheck, RefreshCw,
  Ticket, BarChart2, Settings, LogOut, Coins, Calendar, FileText, Trophy,
} from "lucide-react";
import AdminPendingBadge from "./AdminPendingBadge";
import AdminSidebarShell from "./AdminSidebarShell";

const navItems = [
  { href: "/admin",            label: "대시보드",      icon: LayoutDashboard },
  { href: "/admin/shops",      label: "업소 관리",     icon: Store           },
  { href: "/admin/shop-posts", label: "업소 게시글",   icon: FileText        },
  { href: "/admin/users",      label: "회원 관리",     icon: Users           },
  { href: "/admin/points",     label: "포인트 관리",   icon: Coins           },
  { href: "/admin/rankings",   label: "포인트 랭킹",   icon: Trophy          },
  { href: "/admin/categories", label: "카테고리 관리", icon: Tag             },
  { href: "/admin/boards",     label: "게시판 관리",   icon: MessageSquare   },
  { href: "/admin/coupons",    label: "쿠폰 / 이벤트", icon: Ticket         },
  { href: "/admin/messages",   label: "쪽지 관리",     icon: Mail            },
  { href: "/admin/inquiries",  label: "업소 문의함",   icon: Inbox           },
  { href: "/admin/claims",     label: "소유권 신청",   icon: ShieldCheck     },
  { href: "/admin/sync",       label: "데이터 동기화", icon: RefreshCw       },
  { href: "/admin/stats",      label: "통계",          icon: BarChart2       },
  { href: "/admin/analytics", label: "분석 대시보드", icon: BarChart2       },
  { href: "/admin/settings",   label: "사이트 설정",   icon: Settings        },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // 업소 게시글 승인 대기 (file-based, mtime 캐시 적용됨)
  const shopPostPending = getShopPosts({ status: "pending" }).total;

  // 사이드바 카운트 — find/findMany 회수, 모두 indexed COUNT 직접 호출
  const [shopTotal, memberPending, messagesUnacked, inquiriesNew, claimsPending] = await Promise.all([
    prisma.shop.count({ where: { isVisible: true } }),
    prisma.user.count({ where: { role: "SHOP", status: "BLOCKED", isVirtual: false } }),
    prisma.message.count({ where: { adminAcknowledgedAt: null } }),
    prisma.adminInquiry.count({ where: { status: "NEW" } }),
    prisma.claimRequest.count({ where: { status: "PENDING" } }),
  ]);

  const sidebarBody = (
    <>
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-yellow-400 font-bold text-lg tracking-wide">BAM Admin</span>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <Icon size={16} />
              <span className="flex-1">{label}</span>

              {/* 업소 총 갯수 — 정적 표시 */}
              {href === "/admin/shops" && shopTotal > 0 && (
                <span className="text-xs bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full font-medium leading-none pointer-events-none select-none">
                  {shopTotal.toLocaleString()}
                </span>
              )}

              {/* 업소 게시글 승인 대기 — 점멸 + 알림음 */}
              {href === "/admin/shop-posts" && (
                <AdminPendingBadge
                  initialCount={shopPostPending}
                  pollUrl="/api/admin/shop-posts-pending"
                  channel="admin:shop-post-pending"
                />
              )}

              {/* 회원 가입 승인 대기 — 점멸 + 알림음 */}
              {href === "/admin/users" && (
                <AdminPendingBadge
                  initialCount={memberPending}
                  pollUrl="/api/admin/pending-count"
                  channel="admin:member-pending"
                />
              )}

              {/* 쪽지 관리 — 미확인(adminAcknowledgedAt IS NULL) — 점멸 + 알림음 */}
              {href === "/admin/messages" && (
                <AdminPendingBadge
                  initialCount={messagesUnacked}
                  pollUrl="/api/admin/messages-new-count"
                  channel="admin:msg-ack"
                />
              )}

              {/* 업소 문의함 — NEW(미확인) — 점멸 + 알림음 */}
              {href === "/admin/inquiries" && (
                <AdminPendingBadge
                  initialCount={inquiriesNew}
                  pollUrl="/api/admin/inquiries-new-count"
                  channel="admin:inquiry-new"
                />
              )}

              {/* 소유권 신청 — PENDING(검토 대기) — 점멸 + 알림음 */}
              {href === "/admin/claims" && (
                <AdminPendingBadge
                  initialCount={claimsPending}
                  pollUrl="/api/admin/claims-pending-count"
                  channel="admin:claim-pending"
                />
              )}
            </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link href="/attend"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <Calendar size={16} />
          출석부
        </Link>
        <Link href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <LogOut size={16} />
          사이트로 이동
        </Link>
      </div>
    </>
  );

  return (
    <AdminSidebarShell
      pageTitle="관리자 페이지"
      username={session?.user?.name ?? "admin"}
      rightSlot={
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}>
          <button type="submit" className="text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50">
            로그아웃
          </button>
        </form>
      }
      mainContent={children}
    >
      {sidebarBody}
    </AdminSidebarShell>
  );
}
