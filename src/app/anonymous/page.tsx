import Link from "next/link";
import { auth } from "@/auth";
import { Eye, EyeOff, MessageCircle, PlusCircle, UserCircle, LogIn } from "lucide-react";
import { getBoardPosts } from "@/lib/actions/boardPost";
import Breadcrumb from "@/components/Breadcrumb";

const PAGE_SIZE = 20;
const CATEGORY  = "anonymous";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AnonymousListPage({ searchParams }: Props) {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const { rows, total } = await getBoardPosts(CATEGORY, page, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "커뮤니티" }, { label: "익명게시판" }]} />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <UserCircle size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800">익명 게시판</h1>
            <p className="text-[11px] text-gray-400 truncate">
              {isLoggedIn ? "회원·관리자가 익명으로 자유롭게 의견 교환" : "비회원은 제목만 열람 가능 — 본문은 로그인 후"}
            </p>
          </div>
        </div>
        {isLoggedIn ? (
          <Link href="/anonymous/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-black shadow-sm transition-all shrink-0">
            <PlusCircle size={13} /> 새 글
          </Link>
        ) : (
          <Link href={`/login?callbackUrl=${encodeURIComponent("/anonymous")}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-500 transition-all shrink-0">
            <LogIn size={13} /> 로그인
          </Link>
        )}
      </div>

      {/* 비회원 안내 배너 */}
      {!isLoggedIn && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <EyeOff size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <span>
            비회원은 <strong>제목만 열람</strong>할 수 있습니다. 본문/댓글을 보려면 <strong>로그인</strong>해 주세요.
          </span>
        </div>
      )}

      {/* 목록 */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          아직 글이 없습니다. 첫 글을 작성해 주세요.
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {rows.map((post) => {
            const Inner = (
              <div className="px-5 py-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold shrink-0">
                  ?
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{post.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-gray-400">
                    <span className="text-gray-500 font-medium">익명</span>
                    <span className="ml-auto inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-0.5"><Eye size={10} /> {post.viewCount}</span>
                      <span className="inline-flex items-center gap-0.5"><MessageCircle size={10} /> {post.commentCount}</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
            return (
              <li key={post.id}>
                {isLoggedIn ? (
                  <Link href={`/anonymous/${post.id}`} className="block hover:bg-gray-50/60 transition-colors">
                    {Inner}
                  </Link>
                ) : (
                  // 비회원: 클릭 시 로그인으로 유도
                  <Link href={`/login?callbackUrl=${encodeURIComponent(`/anonymous/${post.id}`)}`}
                    className="block hover:bg-gray-50/60 transition-colors"
                    title="본문 열람을 위해 로그인 필요">
                    {Inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{page} / {totalPages} 페이지 · 총 {total}건</span>
          <div className="flex gap-1">
            {page > 1 && <Link href={`/anonymous?page=${page - 1}`} className="px-3 py-1 rounded hover:bg-gray-100">이전</Link>}
            {page < totalPages && <Link href={`/anonymous?page=${page + 1}`} className="px-3 py-1 rounded hover:bg-gray-100">다음</Link>}
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
