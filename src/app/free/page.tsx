import Link from "next/link";
import { auth } from "@/auth";
import { Eye, MessageCircle, PlusCircle, MessageSquare, LogIn, Search, Shield, Store } from "lucide-react";
import { getBoardPosts } from "@/lib/actions/boardPost";
import Breadcrumb from "@/components/Breadcrumb";
import PinnedNotices from "@/components/PinnedNotices";

const PAGE_SIZE = 20;
const CATEGORY  = "free";

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function FreeListPage({ searchParams }: Props) {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  const sp   = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q    = (sp.q ?? "").trim();

  const { rows: allRows, total: rawTotal } = await getBoardPosts(CATEGORY, 1, 1000);

  const rows = q
    ? allRows.filter((r) =>
        r.title.toLowerCase().includes(q.toLowerCase()) ||
        r.content.toLowerCase().includes(q.toLowerCase()),
      )
    : allRows;

  const total      = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible    = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const buildUrl = (overrides: Record<string, string>) => {
    const p: Record<string, string> = { q, ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/free${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "커뮤니티" }, { label: "자유게시판" }]} />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 text-black flex items-center justify-center shadow-sm shrink-0">
            <MessageSquare size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800">자유게시판</h1>
            <p className="text-[11px] text-gray-400 truncate">실명(닉네임)으로 자유롭게 의견 교환</p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">총 {rawTotal}건</span>
        </div>
        {isLoggedIn ? (
          <Link href="/free/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-500 shadow-sm transition-all shrink-0">
            <PlusCircle size={13} /> 새 글
          </Link>
        ) : (
          <Link href={`/login?callbackUrl=${encodeURIComponent("/free")}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-black shadow-sm transition-all shrink-0">
            <LogIn size={13} /> 로그인
          </Link>
        )}
      </div>

      {/* 검색 */}
      <form method="GET" action="/free" className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 focus-within:border-yellow-400">
          <Search size={14} className="text-gray-400" />
          <input
            name="q" defaultValue={q}
            placeholder="제목 / 내용 검색"
            className="flex-1 text-sm py-2 bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
          />
        </div>
        <button type="submit"
          className="px-5 py-2 bg-yellow-400 text-black rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-colors">
          검색
        </button>
        {q && (
          <Link href="/free"
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            초기화
          </Link>
        )}
      </form>

      {/* 핀 공지 */}
      <PinnedNotices category="free" />

      {/* 목록 */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          {q ? "검색 결과가 없습니다." : "아직 글이 없습니다. 첫 글을 작성해 주세요."}
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {visible.map((post) => (
            <li key={post.id}>
              <Link href={`/free/${post.id}`} className="block hover:bg-gray-50/60 transition-colors">
                <div className="px-5 py-4 flex items-start gap-3">
                  <div className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    post.author.role === "ADMIN" ? "bg-purple-100 text-purple-700"
                    : post.author.role === "SHOP" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-600",
                  ].join(" ")}>
                    {post.author.nickname.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">{post.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-gray-400">
                      <span className="text-gray-600 font-medium">{post.author.nickname}</span>
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
                      <span className="ml-auto inline-flex items-center gap-2">
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
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1 rounded hover:bg-gray-100">이전</Link>}
            {page < totalPages && <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1 rounded hover:bg-gray-100">다음</Link>}
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
