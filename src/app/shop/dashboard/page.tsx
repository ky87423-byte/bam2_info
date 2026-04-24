import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserById, getShopPosts, getShopCouponStats } from "@/lib/data";
import { actionDeleteShopPost } from "@/lib/actions/shop-post";
import { PlusCircle, Pencil, Trash2, Clock, CheckCircle, XCircle, Tag, Users } from "lucide-react";

const STATUS_CONFIG = {
  pending:  { label: "승인 대기", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
  approved: { label: "승인됨",    color: "bg-green-50 text-green-700 border-green-200",   icon: CheckCircle },
  rejected: { label: "거절됨",    color: "bg-red-50 text-red-700 border-red-200",         icon: XCircle },
} as const;

export default async function ShopDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const authorId = parseInt(session.user.id);
  const user = getUserById(authorId);
  if (!user) redirect("/login");

  const { posts, total } = getShopPosts({ authorId });
  const limit       = user.shopPostLimit ?? 3;
  const couponStats = getShopCouponStats(authorId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">내 업소 게시글</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} / {limit}개 사용 중
          </p>
        </div>
        {total < limit ? (
          <Link
            href="/shop/post/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            <PlusCircle size={15} />
            새 게시글 작성
          </Link>
        ) : (
          <span className="text-sm text-gray-400 px-4 py-2 bg-gray-100 rounded-lg">
            게시글 한도 도달 ({limit}개)
          </span>
        )}
      </div>

      {/* 쿠폰 현황 */}
      {couponStats.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Tag size={16} className="text-green-500" />
            내 쿠폰 현황
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {couponStats.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
                  <Tag size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                  <p className="text-xs text-green-600 font-medium">{c.discount}</p>
                  {c.validUntil && <p className="text-xs text-gray-400">{c.validUntil} 까지</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Users size={11} />
                    받기 {c.claimCount}{c.maxIssue ? ` / ${c.maxIssue}` : ""}명
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">사용 {c.usedCount}명</p>
                  {!c.isActive && <p className="text-xs text-red-400">비활성</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <p className="text-gray-400 mb-4">등록된 게시글이 없습니다.</p>
          <Link href="/shop/post/new" className="text-sm text-blue-500 hover:underline">
            첫 번째 게시글 작성하기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const cfg = STATUS_CONFIG[post.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={post.id} className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4">
                {post.mainPhoto && (
                  <img
                    src={post.mainPhoto}
                    alt={post.company}
                    className="w-20 h-20 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-gray-800 truncate">{post.company}</h2>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <StatusIcon size={11} />
                      {cfg.label}
                    </span>
                  </div>
                  {post.subject && <p className="text-sm text-gray-500 truncate">{post.subject}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    {post.area && <span>{post.area}</span>}
                    {post.category && <span>{post.category}</span>}
                    {post.phone && <span>{post.phone}</span>}
                    <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                  {post.status === "rejected" && post.rejectedReason && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                      거절 사유: {post.rejectedReason}
                    </p>
                  )}
                  {post.status === "pending" && (
                    <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg">
                      관리자 승인 후 일반 회원에게 노출됩니다.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/shop/post/${post.id}/edit`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"
                  >
                    <Pencil size={12} />
                    수정
                  </Link>
                  <form action={async () => {
                    "use server";
                    await actionDeleteShopPost(post.id);
                    redirect("/shop/dashboard");
                  }}>
                    <button
                      type="submit"
                      onClick={() => { /* confirm handled by browser */ }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={12} />
                      삭제
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
