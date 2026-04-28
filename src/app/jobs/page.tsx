import Link from "next/link";
import { auth } from "@/auth";
import {
  Eye, MessageCircle, PlusCircle, Briefcase, LogIn, Search,
} from "lucide-react";
import { getBoardPosts } from "@/lib/actions/boardPost";
import Breadcrumb from "@/components/Breadcrumb";
import PinnedNotices from "@/components/PinnedNotices";

const PAGE_SIZE = 20;
const CATEGORY  = "jobs";

interface Props {
  searchParams: Promise<{ page?: string; type?: string; q?: string }>;
}

// 제목 prefix 파서
function parsePrefix(title: string): { type: "구인" | "구직" | null; rest: string } {
  if (title.startsWith("[구인]")) return { type: "구인", rest: title.slice(4).trim() };
  if (title.startsWith("[구직]")) return { type: "구직", rest: title.slice(4).trim() };
  return { type: null, rest: title };
}

export default async function JobsPage({ searchParams }: Props) {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  const sp   = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const type = (sp.type ?? "").trim();
  const q    = (sp.q    ?? "").trim();

  const { rows: allRows, total: rawTotal } = await getBoardPosts(CATEGORY, 1, 1000);

  // 클라이언트사이드 필터링 (jobs 는 list 가 작다고 가정)
  let rows = allRows;
  if (type === "구인" || type === "구직") {
    rows = rows.filter((r) => r.title.startsWith(`[${type}]`));
  }
  if (q) {
    const lq = q.toLowerCase();
    rows = rows.filter((r) =>
      r.title.toLowerCase().includes(lq) || r.content.toLowerCase().includes(lq),
    );
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const buildUrl = (overrides: Record<string, string>) => {
    const p: Record<string, string> = { type, q, ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/jobs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "커뮤니티" }, { label: "구인구직" }]} />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 text-black flex items-center justify-center shadow-sm shrink-0">
            <Briefcase size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800">구인구직</h1>
            <p className="text-[11px] text-gray-400 truncate">
              매장 구인 / 구직자 글을 함께 모은 공간 — 댓글로 안전하게 연락
            </p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">총 {rawTotal}건</span>
        </div>
        {isLoggedIn ? (
          <Link href="/jobs/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-500 shadow-sm transition-all shrink-0">
            <PlusCircle size={13} /> 새 글
          </Link>
        ) : (
          <Link href={`/login?callbackUrl=${encodeURIComponent("/jobs")}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-black shadow-sm transition-all shrink-0">
            <LogIn size={13} /> 로그인
          </Link>
        )}
      </div>

      {/* 말머리 칩 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Link href={buildUrl({ type: "" })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !type
              ? "bg-yellow-400 text-black border-yellow-400 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >전체</Link>
        <Link href={buildUrl({ type: "구인" })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            type === "구인"
              ? "bg-blue-500 text-white border-blue-500 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >[구인]</Link>
        <Link href={buildUrl({ type: "구직" })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            type === "구직"
              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >[구직]</Link>
      </div>

      {/* 검색 */}
      <form method="GET" action="/jobs" className="flex flex-wrap gap-2 mb-4">
        {type && <input type="hidden" name="type" value={type} />}
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
        {(type || q) && (
          <Link href="/jobs"
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            초기화
          </Link>
        )}
      </form>

      {/* 핀 공지 */}
      <PinnedNotices category="jobs" />

      {/* 목록 */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          {(type || q) ? "검색 결과가 없습니다." : "아직 글이 없습니다. 첫 글을 작성해 주세요."}
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {visible.map((post) => {
            const { type: prefix, rest } = parsePrefix(post.title);
            return (
              <li key={post.id}>
                <Link href={`/jobs/${post.id}`} className="block hover:bg-gray-50/60 transition-colors">
                  <div className="px-5 py-4 flex items-start gap-3">
                    {prefix && (
                      <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        prefix === "구인"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        [{prefix}]
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{rest || post.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-gray-400">
                        <span className="text-gray-500 font-medium">{post.author.nickname}</span>
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
            );
          })}
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
