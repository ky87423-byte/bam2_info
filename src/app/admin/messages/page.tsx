import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Search, MessageSquare, Send } from "lucide-react";
import AdminMessageRow from "./AdminMessageRow";
import AdminSendForm from "./AdminSendForm";

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminMessagesPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const params = await searchParams;
  const q    = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const where = q
    ? { content: { contains: q, mode: "insensitive" as const } }
    : {};

  const [rows, total, allUsers] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        sender:   { select: { id: true, nickname: true, username: true, role: true } },
        receiver: { select: { id: true, nickname: true, username: true, role: true } },
      },
    }),
    prisma.message.count({ where }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, username: true, nickname: true, role: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare size={20} className="text-indigo-500" />
        <h2 className="text-xl font-bold text-gray-800">쪽지 관리</h2>
        <span className="text-xs text-gray-400 ml-2">
          전체 {total.toLocaleString()}건
        </span>
      </div>

      {/* 관리자 직접 발송 */}
      <div className="mb-6 bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-1.5">
          <Send size={14} className="text-indigo-500" />
          관리자 명의로 쪽지 보내기
        </h3>
        <AdminSendForm users={allUsers.map((u) => ({
          id: u.id, username: u.username, nickname: u.nickname, role: String(u.role).toLowerCase(),
        }))} />
      </div>

      {/* 키워드 검색 */}
      <form method="GET" className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="쪽지 내용 검색 (스팸·키워드 등)"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          type="submit"
          className="px-4 h-10 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900"
        >
          검색
        </button>
        {q && (
          <Link href="/admin/messages" className="px-3 h-10 inline-flex items-center text-xs text-gray-500 hover:text-gray-700">
            초기화
          </Link>
        )}
      </form>

      {/* 쪽지 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">시간</th>
                <th className="px-4 py-2.5 text-left font-medium">보낸이</th>
                <th className="px-4 py-2.5 text-left font-medium">받는이</th>
                <th className="px-4 py-2.5 text-left font-medium">내용</th>
                <th className="px-4 py-2.5 text-center font-medium">읽음</th>
                <th className="px-4 py-2.5 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                    {q ? `"${q}" 와 일치하는 쪽지가 없습니다.` : "쪽지가 없습니다."}
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <AdminMessageRow
                    key={m.id}
                    id={m.id}
                    createdAt={m.createdAt.toISOString()}
                    sender={{ ...m.sender, role: String(m.sender.role).toLowerCase() }}
                    receiver={{ ...m.receiver, role: String(m.receiver.role).toLowerCase() }}
                    content={m.content}
                    isRead={m.isRead}
                    adminAcknowledgedAt={m.adminAcknowledgedAt ? m.adminAcknowledgedAt.toISOString() : null}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>{page} / {totalPages} 페이지</span>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={`/admin/messages?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page - 1}`}
                  className="px-3 py-1 rounded hover:bg-gray-100">이전</Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/messages?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page + 1}`}
                  className="px-3 py-1 rounded hover:bg-gray-100">다음</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
