import Link from "next/link";
import { auth } from "@/auth";
import {
  getCoupons, getUserCoupons, getCouponClaimCounts, couponLabel,
  getAreas, getBizTypes,
} from "@/lib/data";
import { getViewCounts } from "@/lib/viewTracker";
import { Tag, Store, Clock, MapPin, ImageIcon, Eye, Search } from "lucide-react";

interface Props {
  searchParams: Promise<{ area?: string; bizType?: string; q?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function CouponsPage({ searchParams }: Props) {
  const params  = await searchParams;
  const area    = (params.area    ?? "").trim();
  const bizType = (params.bizType ?? "").trim();
  const q       = (params.q       ?? "").trim();
  const page    = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const session  = await auth();
  const userId   = session?.user?.id ? parseInt(session.user.id) : null;
  const loggedIn = !!userId;

  const today    = new Date().toISOString().slice(0, 10);
  const allActive = getCoupons()
    .filter((c) => (c.type ?? "coupon") === "coupon" && c.isActive && (!c.validUntil || c.validUntil >= today));

  // 필터 적용
  let filtered = allActive;
  if (area)    filtered = filtered.filter((c) => (c.area ?? "") === area);
  if (bizType) filtered = filtered.filter((c) => (c.bizType ?? "") === bizType);
  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter((c) =>
      c.title.toLowerCase().includes(lq) ||
      (c.description ?? "").toLowerCase().includes(lq) ||
      (c.shopName ?? "").toLowerCase().includes(lq),
    );
  }

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 카운트 / 받음 여부 / 조회수
  const claimedIds = new Set(userId ? getUserCoupons(userId).map((uc) => uc.couponId) : []);
  const counts     = getCouponClaimCounts();
  const views      = getViewCounts("coupon");

  // 필터용 area/bizType 옵션 — 활성 쿠폰에서 직접 추출 (중복 제거 + 알파벳순)
  const couponAreas = [...new Set(allActive.map((c) => c.area).filter((a): a is string => !!a))].sort();
  const couponBizTypes = [...new Set(allActive.map((c) => c.bizType).filter((b): b is string => !!b))].sort();
  // 비어 있으면 전역 데이터에서 보충
  const areaOptions    = couponAreas.length ? couponAreas : getAreas().slice(0, 30);
  const bizTypeOptions = couponBizTypes.length ? couponBizTypes : getBizTypes().map((b) => b.name);

  const buildUrl = (overrides: Record<string, string>) => {
    const p: Record<string, string> = { area, bizType, q, ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/coupons${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Tag size={22} className="text-green-500" />
        <h1 className="text-2xl font-bold text-gray-800">쿠폰 게시판</h1>
        <span className="text-sm text-gray-400">총 {total}건</span>
      </div>

      {/* 필터 */}
      <form method="GET" action="/coupons" className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 border border-gray-200 rounded-lg px-3 focus-within:border-blue-400">
          <Search size={14} className="text-gray-400" />
          <input
            name="q" defaultValue={q}
            placeholder="제목 / 본문 / 업소명 검색"
            className="flex-1 text-sm outline-none py-2"
          />
        </div>
        <select
          name="area" defaultValue={area}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">전체 지역</option>
          {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          name="bizType" defaultValue={bizType}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">전체 업종</option>
          {bizTypeOptions.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <button
          type="submit"
          className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          검색
        </button>
        {(area || bizType || q) && (
          <Link
            href="/coupons"
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 리스트 */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
          <Tag size={32} className="mx-auto mb-3 opacity-30" />
          <p>{(area || bizType || q) ? "검색 결과가 없습니다." : "현재 이용 가능한 쿠폰이 없습니다."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((coupon) => {
            const claimCount = counts[coupon.id] ?? 0;
            const isSoldOut  = !!(coupon.maxIssue && coupon.maxIssue > 0 && claimCount >= coupon.maxIssue);
            const claimed    = loggedIn && claimedIds.has(coupon.id);
            const view       = views[String(coupon.id)] ?? 0;

            return (
              <Link
                key={coupon.id}
                href={`/coupons/${coupon.id}`}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
              >
                {/* 대표 사진 */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {coupon.mainPhoto ? (
                    <img
                      src={coupon.mainPhoto}
                      alt={coupon.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={32} />
                    </div>
                  )}

                  {/* 타입 뱃지 */}
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-green-400 to-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm">
                    <Tag size={11} /> {couponLabel(coupon)}
                  </span>

                  {/* 상태 뱃지 */}
                  {claimed && (
                    <span className="absolute top-2 right-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      받기 완료
                    </span>
                  )}
                  {!claimed && isSoldOut && (
                    <span className="absolute top-2 right-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      소진
                    </span>
                  )}
                </div>

                {/* 본문 요약 */}
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="font-semibold text-gray-800 truncate">{coupon.title}</h2>
                  {coupon.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{coupon.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                    {coupon.area && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {coupon.area}
                      </span>
                    )}
                    {coupon.bizType && (
                      <span className="flex items-center gap-1">
                        <Store size={11} /> {coupon.bizType}
                      </span>
                    )}
                    {coupon.shopName && !coupon.bizType && (
                      <span className="flex items-center gap-1">
                        <Store size={11} /> {coupon.shopName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
                    {coupon.validUntil && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {coupon.validUntil}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye size={11} /> {view}
                    </span>
                    <span className="ml-auto">
                      {coupon.maxIssue && coupon.maxIssue > 0
                        ? `${claimCount}/${coupon.maxIssue}`
                        : `${claimCount}명 받음`}
                    </span>
                  </div>
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
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">이전</Link>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <Link key={p} href={buildUrl({ page: String(p) })}
                className={`px-3 py-1.5 border rounded text-sm ${p === page ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-gray-50"}`}>
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })}
              className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">다음</Link>
          )}
        </div>
      )}
    </div>
  );
}
