import Link from "next/link";
import { getUsers } from "@/lib/data";
import { Search, UserCheck, UserX, Pencil, Store } from "lucide-react";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const { users, total } = await getUsers(q, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pendingShops = users.filter((u) => u.role === "shop" && u.status === "blocked").length;
  // 전체에서 승인 대기 수 확인
  const { users: allUsers } = await getUsers("", 1, 9999);
  const totalPendingShops = allUsers.filter((u) => u.role === "shop" && u.status === "blocked").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">회원 관리</h2>
          {totalPendingShops > 0 && (
            <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
              <Store size={12} />
              업소 승인 대기 {totalPendingShops}명
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">총 {total.toLocaleString()}명</span>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <form method="GET" className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="아이디 또는 이메일 검색..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            검색
          </button>
          {q && (
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              초기화
            </Link>
          )}
        </form>
      </div>

      {/* 회원 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left">
              <th className="px-4 py-3 text-gray-500 font-medium w-10">#</th>
              <th className="px-4 py-3 text-gray-500 font-medium">아이디 / 닉네임</th>
              <th className="px-4 py-3 sr-only"></th>
              <th className="px-4 py-3 text-gray-500 font-medium w-16 text-center">레벨</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-24 text-center">포인트</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">상태</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-28">가입일 / 승인일 / 차단일</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-16 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user, i) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{user.username}</p>
                  <p className="text-xs text-gray-400">{user.nickname}</p>
                </td>
                <td className="px-4 py-3 text-gray-400 sr-only"></td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    Lv.{user.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-700 text-xs">
                  {user.points.toLocaleString()}P
                </td>
                <td className="px-4 py-3 text-center">
                  {user.role === "shop" && user.status === "blocked" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                      <Store size={12} /> 승인 대기
                    </span>
                  ) : user.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <UserCheck size={12} /> 활성
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500">
                      <UserX size={12} /> 차단
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs space-y-0.5">
                  <p className="text-gray-400">{user.joinedAt}</p>
                  {user.approvedAt && <p className="text-green-600">{user.approvedAt}</p>}
                  {user.blockedAt  && <p className="text-red-500">{user.blockedAt}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors"
                  >
                    <Pencil size={11} />
                    수정
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-16 text-gray-400">검색 결과가 없습니다.</div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {page > 1 && (
            <Link
              href={`/admin/users?q=${q}&page=${page - 1}`}
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50"
            >
              이전
            </Link>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <Link
                key={p}
                href={`/admin/users?q=${q}&page=${p}`}
                className={`px-3 py-1.5 border rounded text-sm ${p === page ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-gray-50"}`}
              >
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link
              href={`/admin/users?q=${q}&page=${page + 1}`}
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
