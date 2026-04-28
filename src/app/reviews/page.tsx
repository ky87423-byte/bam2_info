import Link from "next/link";
import { auth } from "@/auth";
import { getReviews, REVIEW_BIZ_TYPES } from "@/lib/data";
import {
  Star, ShieldCheck, ImageIcon, MessageSquare, MapPin,
  PlusCircle, Search,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "커뮤니티" }, { label: "후기게시판" }]} />

      {/* 헤더 — 텍스트 위주, 배경 없음 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck size={22} className="text-yellow-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800">인증 후기 게시판</h1>
            <p className="text-[11px] text-gray-400">실제 방문하고 사용 확인된 후기 — 일반 후기보다 5배 포인트</p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">총 {total}건</span>
        </div>
        {loggedIn && (
          <Link
            href="/reviews/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-500 shadow-sm transition-all shrink-0"
          >
            <PlusCircle size={13} /> 후기 작성
          </Link>
        )}
      </div>

      {/* 말머리 (업종) 칩 — 화이트 톤 + 선택 시 옐로우 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Link
          href={buildUrl({ bizType: "" })}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !bizType
              ? "bg-yellow-400 text-black border-yellow-400 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          전체
        </Link>
        {REVIEW_BIZ_TYPES.map((t) => (
          <Link
            key={t}
            href={buildUrl({ bizType: t })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              bizType === t
                ? "bg-yellow-400 text-black border-yellow-400 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            #{t}
          </Link>
        ))}
      </div>

      {/* 검색 + 인증만 토글 — 화이트 톤 */}
      <form method="GET" action="/reviews" className="flex flex-wrap gap-2 mb-6">
        {bizType && <input type="hidden" name="bizType" value={bizType} />}
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 focus-within:border-yellow-400">
          <Search size={14} className="text-gray-400" />
          <input
            name="q" defaultValue={q}
            placeholder="제목 / 본문 / 업소명 검색"
            className="flex-1 text-sm py-2 bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
          />
        </div>
        <label className="flex items-center gap-1.5 px-3 bg-white border border-gray-200 rounded-lg cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox" name="certified" value="1" defaultChecked={certified}
            className="w-3.5 h-3.5 accent-yellow-500"
          />
          <ShieldCheck size={12} className="text-orange-500" />
          인증만
        </label>
        <button
          type="submit"
          className="px-5 py-2 bg-yellow-400 text-black rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-colors"
        >
          검색
        </button>
        {(bizType || q || certified) && (
          <Link href="/reviews" className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            초기화
          </Link>
        )}
      </form>

      {/* 갤러리 — 화이트 카드 */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          <MessageSquare size={32} className="mx-auto mb-3 text-gray-300" />
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
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col"
              >
                {/* 사진 */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {r.mainPhoto ? (
                    <img src={r.mainPhoto} alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={36} />
                    </div>
                  )}
                  {/* 인증 배지 — 오렌지 포인트 */}
                  {r.isCertified && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                      <ShieldCheck size={11} /> 실제 방문 인증
                    </span>
                  )}
                  {/* 말머리 */}
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 text-gray-700 text-[10px] font-semibold rounded-full shadow-sm border border-gray-100">
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
                  <h2 className="font-bold text-gray-800 truncate group-hover:text-yellow-600 transition-colors">
                    {r.title}
                  </h2>
                  <p className="text-xs text-gray-500 line-clamp-2">{r.content}</p>

                  {/* 평점 + 업소 */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={11} /> {r.shopName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-bold text-yellow-600">{avg.toFixed(1)}</span>
                    </span>
                  </div>

                  {/* 태그 — 최대 3개 */}
                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
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
              className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">이전</Link>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <Link key={p} href={buildUrl({ page: String(p) })}
                className={`px-3 py-1.5 border rounded text-sm ${
                  p === page
                    ? "bg-yellow-400 text-black border-yellow-400 font-bold"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">다음</Link>
          )}
        </div>
      )}
    </div>
  );
}
