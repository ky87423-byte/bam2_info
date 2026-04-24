import { getPointLogs, getUsers } from "@/lib/data";
import { adminAwardPointsAction } from "@/lib/actions/auth";
import { TrendingUp, TrendingDown, Coins } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  signup: "회원가입",
  login: "일일 로그인",
  attend: "출석체크",
  post: "게시글 작성",
  comment: "댓글 작성",
  admin: "관리자 지급",
  etc: "기타",
};

interface Props {
  searchParams: Promise<{ page?: string; userId?: string }>;
}

export default async function AdminPointsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const filterUserId = params.userId ? parseInt(params.userId) : undefined;
  const PAGE_SIZE = 30;

  const { logs, total } = getPointLogs({ userId: filterUserId, page, pageSize: PAGE_SIZE });
  const { users } = getUsers("", 1, 999);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const totalAwarded = logs.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const totalDeducted = logs.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">포인트 관리</h2>
        <div className="flex gap-3 text-sm">
          <span className="text-green-600 font-medium">+{totalAwarded.toLocaleString()}P 지급</span>
          <span className="text-red-500 font-medium">{totalDeducted.toLocaleString()}P 차감</span>
        </div>
      </div>

      {/* 수동 지급/차감 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Coins size={15} className="text-yellow-500" />
          포인트 수동 지급 / 차감
        </h3>
        <form action={adminAwardPointsAction} className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">회원</label>
            <select
              name="userId"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="">선택</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.points.toLocaleString()}P)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">포인트 (차감은 음수)</label>
            <input
              type="number"
              name="amount"
              required
              placeholder="예: 100 또는 -50"
              className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 block mb-1">사유</label>
            <input
              type="text"
              name="memo"
              placeholder="포인트 지급 사유"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            적용
          </button>
        </form>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <form method="GET" className="flex gap-2 items-center">
          <label className="text-xs text-gray-500">회원별 필터:</label>
          <select
            name="userId"
            defaultValue={filterUserId?.toString() ?? ""}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
          >
            <option value="">전체</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
          <button type="submit" className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
            적용
          </button>
          {filterUserId && (
            <a href="/admin/points" className="px-3 py-2 bg-gray-50 text-gray-500 rounded-lg text-sm hover:bg-gray-100">
              초기화
            </a>
          )}
          <span className="text-xs text-gray-400 ml-auto">총 {total.toLocaleString()}건</span>
        </form>
      </div>

      {/* 내역 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left">
              <th className="px-4 py-3 text-gray-500 font-medium">일시</th>
              <th className="px-4 py-3 text-gray-500 font-medium">회원</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-24">구분</th>
              <th className="px-4 py-3 text-gray-500 font-medium">내용</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-24 text-right">지급/차감</th>
              <th className="px-4 py-3 text-gray-500 font-medium w-24 text-right">잔액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("ko-KR", {
                    month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{log.username}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{log.memo}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold text-sm flex items-center justify-end gap-1 ${log.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {log.amount >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {log.amount >= 0 ? "+" : ""}{log.amount.toLocaleString()}P
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500 text-xs font-medium">
                  {log.balance.toLocaleString()}P
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-16 text-gray-400">포인트 내역이 없습니다.</div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {page > 1 && (
            <a href={`/admin/points?userId=${filterUserId ?? ""}&page=${page - 1}`}
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">이전</a>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <a key={p} href={`/admin/points?userId=${filterUserId ?? ""}&page=${p}`}
                className={`px-3 py-1.5 border rounded text-sm ${p === page ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-gray-50"}`}>
                {p}
              </a>
            );
          })}
          {page < totalPages && (
            <a href={`/admin/points?userId=${filterUserId ?? ""}&page=${page + 1}`}
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">다음</a>
          )}
        </div>
      )}
    </div>
  );
}
