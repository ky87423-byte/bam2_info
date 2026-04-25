import Link from "next/link";
import { Lock, PlusCircle, MessageCircle, Eye, Shield, Store } from "lucide-react";
import { requireShopCommunityAccess } from "./guard";
import { getBoardPosts } from "@/lib/actions/boardPost";

const PAGE_SIZE = 20;
const CATEGORY  = "shop_only";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ShopCommunityListPage({ searchParams }: Props) {
  await requireShopCommunityAccess();   // 서버 가드 (비통과 시 redirect)

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const { rows, total } = await getBoardPosts(CATEGORY, page, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-sm">
            <Lock size={16} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">업소 전용 게시판</h1>
            <p className="text-[11px] text-gray-400">업소회원·관리자만 열람·작성 가능 · 비공개 영역</p>
          </div>
        </div>
        <Link href="/shop-community/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold hover:brightness-110 shadow-sm transition-all">
          <PlusCircle size={13} /> 새 글 작성
        </Link>
      </div>

      {/* 목록 */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          아직 글이 없습니다. 첫 글을 작성해 주세요.
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {rows.map((post) => (
            <li key={post.id}>
              <Link href={`/shop-community/${post.id}`}
                className="block px-5 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    post.author.role === "ADMIN" ? "bg-purple-100 text-purple-700"
                    : post.author.role === "SHOP" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600",
                  ].join(" ")}>
                    {post.author.nickname.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">{post.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-600">{post.author.nickname}</span>
                      {post.author.role === "ADMIN" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold">
                          <Shield size={9} /> 관리자
                        </span>
                      )}
                      {post.author.role === "SHOP" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">
                          <Store size={9} /> 업소
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 ml-auto flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5"><Eye size={10} /> {post.viewCount}</span>
                        <span className="inline-flex items-center gap-0.5"><MessageCircle size={10} /> {post.commentCount}</span>
                        <span>{formatDate(post.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{page} / {totalPages} 페이지 · 총 {total}건</span>
          <div className="flex gap-1">
            {page > 1 && <Link href={`/shop-community?page=${page - 1}`} className="px-3 py-1 rounded hover:bg-gray-100">이전</Link>}
            {page < totalPages && <Link href={`/shop-community?page=${page + 1}`} className="px-3 py-1 rounded hover:bg-gray-100">다음</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  const dt = new Date(d);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - dt.getTime()) / 60_000);
  if (diffMin < 1)  return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return dt.toLocaleDateString("ko-KR");
}
