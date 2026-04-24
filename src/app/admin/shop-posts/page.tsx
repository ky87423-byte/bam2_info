import { getShopPosts } from "@/lib/data";
import { actionApproveShopPost, actionRejectShopPost, actionDeleteShopPost } from "@/lib/actions/shop-post";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const TABS = [
  { key: "pending",  label: "승인 대기", icon: Clock },
  { key: "approved", label: "승인됨",    icon: CheckCircle },
  { key: "rejected", label: "거절됨",    icon: XCircle },
  { key: "all",      label: "전체",      icon: null },
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

export default async function AdminShopPostsPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = (params.status ?? "pending") as "pending" | "approved" | "rejected" | "all";
  const { posts, total } = getShopPosts({ status: tab });

  const pendingCount = getShopPosts({ status: "pending" }).total;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">업소 게시글 관리</h2>
        {pendingCount > 0 && (
          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
            승인 대기 {pendingCount}건
          </span>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <a
            key={key}
            href={`/admin/shop-posts?status=${key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === key ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
            }`}
          >
            {Icon && <Icon size={13} />}
            {label}
            {key === "pending" && pendingCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === key ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
                {pendingCount}
              </span>
            )}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">게시글이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">업소명</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-24">작성자</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">상태</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-24">작성일</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-64 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{post.company}</p>
                    {post.subject && <p className="text-xs text-gray-400 truncate max-w-[200px]">{post.subject}</p>}
                    {post.status === "rejected" && post.rejectedReason && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]">사유: {post.rejectedReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{post.authorUsername}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[post.status]}`}>
                      {post.status === "pending" ? "대기" : post.status === "approved" ? "승인" : "거절"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      {post.status !== "approved" && (
                        <form action={async () => {
                          "use server";
                          await actionApproveShopPost(post.id);
                        }}>
                          <button type="submit" className="px-3 py-1.5 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors font-medium">
                            승인
                          </button>
                        </form>
                      )}
                      {post.status !== "rejected" && (
                        <RejectForm postId={post.id} />
                      )}
                      <form action={async () => {
                        "use server";
                        await actionDeleteShopPost(post.id);
                      }}>
                        <button type="submit" className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 transition-colors">
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-right">총 {total}건</p>
    </div>
  );
}

function RejectForm({ postId }: { postId: number }) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const reason = (formData.get("reason") as string ?? "").trim() || "승인 기준 미달";
        await actionRejectShopPost(postId, reason);
      }}
      className="flex items-center gap-1"
    >
      <input
        type="text"
        name="reason"
        placeholder="거절 사유 (선택)"
        className="border border-gray-200 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:border-red-300"
      />
      <button type="submit" className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded text-xs hover:bg-orange-100 transition-colors font-medium whitespace-nowrap">
        거절
      </button>
    </form>
  );
}
