import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  getCoupons, getUserCoupons, getCouponClaimCounts, couponLabel,
} from "@/lib/data";
import { incrementView, getViewCount } from "@/lib/viewTracker";
import { extractIpFromHeaders } from "@/lib/api/events";
import CommentSection from "@/components/comments/CommentSection";
import ClaimButton from "../ClaimButton";
import {
  ChevronLeft, Tag, MapPin, Store, Clock, Eye, Users,
  ImageIcon, MessageCircle, AlertCircle,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CouponDetailPage({ params }: Props) {
  const { id } = await params;
  const couponId = parseInt(id, 10);
  if (isNaN(couponId)) notFound();

  const coupon = getCoupons().find((c) => c.id === couponId);
  if (!coupon) notFound();
  // 비활성/만료된 쿠폰도 본문은 볼 수 있게 하되, [받기] 버튼은 비활성 처리

  // 조회수 +1 (1시간 IP dedup, 실패 무시)
  try {
    const reqHeaders = await headers();
    const ip = extractIpFromHeaders(reqHeaders);
    incrementView("coupon", couponId, ip);
  } catch { /* ignore */ }

  const session  = await auth();
  const userId   = session?.user?.id ? parseInt(session.user.id) : null;
  const loggedIn = !!userId;

  const claimCount = getCouponClaimCounts()[coupon.id] ?? 0;
  const isSoldOut  = !!(coupon.maxIssue && coupon.maxIssue > 0 && claimCount >= coupon.maxIssue);
  const claimed    = loggedIn && getUserCoupons(userId!).some((uc) => uc.couponId === couponId);
  const viewCount  = getViewCount("coupon", couponId);

  const today    = new Date().toISOString().slice(0, 10);
  const expired  = !!(coupon.validUntil && coupon.validUntil < today);
  const inactive = !coupon.isActive;
  const claimDisabled = isSoldOut || expired || inactive;

  const photos = [
    ...(coupon.mainPhoto ? [coupon.mainPhoto] : []),
    ...((coupon.photos ?? []).filter((p) => p !== coupon.mainPhoto)),
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/coupons" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={14} /> 쿠폰 게시판
      </Link>

      <article className="bg-white rounded-2xl shadow-sm overflow-hidden ring-1 ring-black/5">
        {/* 타입 + 메타 */}
        <header className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-br from-green-400 to-emerald-500 text-white text-xs font-bold rounded-lg">
              <Tag size={11} /> {couponLabel(coupon)}
            </span>
            {inactive && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">비활성</span>}
            {expired  && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">기간 만료</span>}
            {isSoldOut && !expired && (
              <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">선착순 마감</span>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-800">{coupon.title}</h1>

          <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-gray-500">
            {coupon.area && (
              <span className="flex items-center gap-1"><MapPin size={11} /> {coupon.area}</span>
            )}
            {coupon.bizType && (
              <span className="flex items-center gap-1"><Store size={11} /> {coupon.bizType}</span>
            )}
            {coupon.shopName && (
              <span className="flex items-center gap-1 text-blue-600 font-medium">{coupon.shopName}</span>
            )}
            {coupon.validUntil && (
              <span className="flex items-center gap-1"><Clock size={11} /> {coupon.validUntil}까지</span>
            )}
            <span className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye size={11} /> {viewCount}</span>
              <span className="flex items-center gap-1">
                <Users size={11} /> {claimCount}{coupon.maxIssue ? `/${coupon.maxIssue}` : ""}명 받음
              </span>
            </span>
          </div>
        </header>

        {/* 사진 갤러리 */}
        {photos.length > 0 ? (
          <div className="px-6 pt-6">
            <div className="rounded-xl overflow-hidden bg-gray-100">
              <img
                src={photos[0]}
                alt={coupon.title}
                className="w-full h-auto max-h-[480px] object-cover"
              />
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                {photos.slice(1).map((p, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 pt-6">
            <div className="rounded-xl bg-gray-50 aspect-video flex items-center justify-center text-gray-300">
              <ImageIcon size={36} />
            </div>
          </div>
        )}

        {/* 본문 */}
        <div className="px-6 py-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
          {coupon.description?.trim() || (
            <span className="text-gray-400">본문이 비어 있습니다.</span>
          )}
        </div>

        {/* 큰 [쿠폰 받기] 버튼 */}
        <div className="mx-6 mb-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-emerald-200 p-5">
          <div className="text-center">
            <p className="text-xs text-emerald-700 font-semibold mb-1">이 쿠폰 즉시 수령</p>
            <p className="text-lg font-bold text-emerald-800 mb-3">{couponLabel(coupon)}</p>

            {claimDisabled ? (
              <div className="inline-flex items-center justify-center px-8 py-3 bg-gray-200 text-gray-500 rounded-xl text-base font-bold">
                {expired ? "기간이 만료된 쿠폰입니다" : isSoldOut ? "선착순 마감" : "비활성 쿠폰"}
              </div>
            ) : (
              <CouponClaimWrapper
                couponId={coupon.id}
                claimed={claimed}
                loggedIn={loggedIn}
              />
            )}

            <p className="text-[11px] text-emerald-700/70 mt-3">
              받은 쿠폰은 <span className="font-semibold">마이페이지 → 쿠폰 보관함</span>에서 예약 코드와 함께 확인할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 안내문구 — 쪽지 차단 */}
        <div className="mx-6 mb-6 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle size={14} className="shrink-0" />
          <p>
            <strong>문의는 댓글로 남겨주세요.</strong>{" "}
            <span className="text-amber-700/80">업소 사장님께 직접 쪽지를 보내실 수 없습니다.</span>
          </p>
        </div>
      </article>

      {/* 댓글 — boardType="coupon" */}
      <div className="mt-2">
        <CommentSection boardType="coupon" postId={coupon.id} />
      </div>

      {/* 댓글 안내 (작성 전 시각적 강조) */}
      <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
        <MessageCircle size={12} />
        업소 사장님이 댓글로 답변드립니다.
      </p>
    </div>
  );
}

// 큰 버튼 wrap — 기존 ClaimButton 재사용하되 사이즈만 키움
function CouponClaimWrapper({
  couponId, claimed, loggedIn,
}: { couponId: number; claimed: boolean; loggedIn: boolean }) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="[&_button]:!px-10 [&_button]:!py-3 [&_button]:!text-base [&_button]:!font-bold [&_a]:!px-10 [&_a]:!py-3 [&_a]:!text-base [&_a]:!font-bold [&_span]:!px-10 [&_span]:!py-3 [&_span]:!text-base [&_span]:!font-bold">
        <ClaimButton couponId={couponId} claimed={claimed} loggedIn={loggedIn} />
      </div>
    </div>
  );
}
