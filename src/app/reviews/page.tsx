import Link from "next/link";
import { auth } from "@/auth";
import { getReviews, REVIEW_BIZ_TYPES } from "@/lib/data";
import {
  Star, ShieldCheck, ImageIcon, MessageSquare, MapPin,
  PlusCircle, Search,
} from "lucide-react";

interface Props {
  searchParams: Promise<{ bizType?: string; q?: string; certified?: string; page?: string }>;
}

const PAGE_SIZE = 12;

export default async function ReviewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const bizType   = (sp.bizType   ?? "").trim();
  const q         = (sp.q         ?? "").trim();
  const certified = sp.certified === "1";
  const page      = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const session   = await auth();
  const loggedIn  = !!session?.user?.id;

  const rows = getReviews({
    bizType: bizType || undefined,
    q:       q || undefined,
    certifiedOnly: certified,
  });

  const total      = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible    = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const buildUrl = (overrides: Record<string, string>) => {
    const p: Record<string, string> = {
      bizType, q, certified: certified ? "1" : "", ...overrides,
    };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/reviews${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="bg-[#0e0e1a] min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
              <ShieldCheck size={22} /> 인증 후기 게시판
            </h1>
            <span className="text-sm text-white/50">총 {total}건</span>
          </div>
          {loggedIn && (
            <Link
              href="/reviews/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-[#1a1a2e] rounded-lg text-sm font-bold hover:shadow-lg transition-shadow"
            >
              <PlusCircle size={14} /> 후기 작성
            </Link>
          )}
        </div>

        {/* 말머리 (업종) 칩 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Link
            href={buildUrl({ bizType: "" })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !bizType
                ? "bg-yellow-400 text-[#1a1a2e]"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            전체
          </Link>
          {REVIEW_BIZ_TYPES.map((t) => (
            <Link
              key={t}
              href={buildUrl({ bizType: t })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                bizType === t
                  ? "bg-yellow-400 text-[#1a1a2e]"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              #{t}
            </Link>
          ))}
        </div>

        {/* 검색 + 인증만 토글 */}
        <form method="GET" action="/reviews" className="flex flex-wrap gap-2 mb-6">
          {bizType && <input type="hidden" name="bizType" value={bizType} />}
          <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 focus-within:border-yellow-400">
            <Search size={14} className="text-white/40" />
            <input
              name="q" defaultValue={q}
              placeholder="제목 / 본문 / 업소명 검색"
              className="flex-1 text-sm py-2 bg-transparent outline-none text-white placeholder:text-white/40"
            />
          </div>
          <label className="flex items-center gap-1.5 px-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer text-sm">
            <input
              type="checkbox" name="certified" value="1" defaultChecked={certified}
              className="w-3.5 h-3.5 accent-yellow-400"
            />
            <ShieldCheck size={12} className="text-yellow-400" />
            인증 후기만
          </label>
          <button
            type="submit"
            className="px-5 py-2 bg-yellow-400 text-[#1a1a2e] rounded-lg text-sm font-bold hover:bg-yellow-300 transition-colors"
          >
            검색
          </button>
          {(bizType || q || certified) && (
            <Link href="/reviews" className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">
              초기화
            </Link>
          )}
        </form>

        {/* 갤러리 */}
        {visible.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-16 text-center text-white/40">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
            <p>{(bizType || q || certified) ? "검색 결과가 없습니다." : "아직 등록된 후기가 없습니다."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((r) => {
              const avg = Math.round(((r.ratingFacility + r.ratingService + r.ratingPrice) / 3) * 10) / 10;
              return (
                <Link
                  key={r.id}
                  href={`/reviews/${r.id}`}
                  className="bg-white/5 border border-white/10 hover:border-yellow-400/40 rounded-xl overflow-hidden group flex flex-col transition-colors"
                >
                  {/* 사진 */}
                  <div className="aspect-video bg-[#1a1a2e] relative overflow-hidden">
                    {r.mainPhoto ? (
                      <img src={r.mainPhoto} alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <ImageIcon size={36} />
                      </div>
                    )}
                    {/* 인증 배지 */}
                    {r.isCertified && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-[#1a1a2e] text-[10px] font-extrabold rounded shadow-lg">
                        <ShieldCheck size={11} /> 실제 방문 인증
                      </span>
                    )}
                    {/* 말머리 */}
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-yellow-400 text-[10px] font-bold rounded-full">
                      #{r.bizType}
                    </span>
                    {r.photos.length > 1 && (
                      <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">
                        +{r.photos.length - 1}
                      </span>
                    )}
                  </div>
                  {/* 본문 요약 */}
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <h2 className="font-bold text-white truncate group-hover:text-yellow-400 transition-colors">
                      {r.title}
                    </h2>
                    <p className="text-xs text-white/50 line-clamp-2">{r.content}</p>

                    {/* 평점 + 업소 */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/10">
                      <span className="flex items-center gap-1 text-xs text-white/60">
                        <MapPin size={11} /> {r.shopName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">{avg.toFixed(1)}</span>
                      </span>
                    </div>

                    {/* 태그 — 최대 3개 */}
                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/70 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1 mt-8">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 bg-white/10 border border-white/10 rounded text-sm hover:bg-white/20">이전</Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Link key={p} href={buildUrl({ page: String(p) })}
                  className={`px-3 py-1.5 border rounded text-sm ${
                    p === page
                      ? "bg-yellow-400 text-[#1a1a2e] border-yellow-400 font-bold"
                      : "bg-white/10 border-white/10 hover:bg-white/20"
                  }`}>
                  {p}
                </Link>
              );
            })}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 bg-white/10 border border-white/10 rounded text-sm hover:bg-white/20">다음</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
