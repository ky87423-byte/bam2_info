import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { getReviewById } from "@/lib/data";
import { incrementView, getViewCount } from "@/lib/viewTracker";
import { extractIpFromHeaders } from "@/lib/api/events";
import {
  ChevronLeft, ShieldCheck, Star, Eye, Calendar, MapPin, Pencil,
} from "lucide-react";
import DeleteReviewButton from "./DeleteReviewButton";

interface Props {
  params: Promise<{ id: string }>;
}

function StarBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/60 w-12 shrink-0">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            className={i <= value ? "fill-yellow-400 text-yellow-400" : "text-white/20"}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-yellow-400">{value}.0</span>
    </div>
  );
}

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params;
  const reviewId = parseInt(id, 10);
  if (isNaN(reviewId)) notFound();

  const review = getReviewById(reviewId);
  if (!review) notFound();

  // 조회수
  try {
    const reqHeaders = await headers();
    const ip = extractIpFromHeaders(reqHeaders);
    incrementView("review", reviewId, ip);
  } catch { /* ignore */ }
  const viewCount = getViewCount("review", reviewId);

  const session = await auth();
  const userId  = session?.user?.id ? parseInt(session.user.id) : null;
  const isAuthor = userId === review.authorId;
  const isAdmin  = session?.user?.role === "admin";
  const canEdit  = isAuthor || isAdmin;

  const avg = (review.ratingFacility + review.ratingService + review.ratingPrice) / 3;

  return (
    <div className="bg-[#0e0e1a] min-h-screen text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/reviews" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-yellow-400 mb-4">
          <ChevronLeft size={14} /> 인증 후기 게시판
        </Link>

        <article className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* 인증 배지 + 말머리 */}
          <div className="px-6 pt-5 pb-3 flex items-center gap-2 flex-wrap">
            {review.isCertified && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-[#1a1a2e] text-xs font-extrabold rounded-full shadow-md">
                <ShieldCheck size={12} /> 실제 방문 인증
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400/15 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/30">
              #{review.bizType}
            </span>
            {!review.isCertified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 text-white/50 text-[10px] rounded-full">
                일반 후기
              </span>
            )}
          </div>

          {/* 제목 */}
          <header className="px-6 pb-4 border-b border-white/10">
            <h1 className="text-xl font-bold text-white">{review.title}</h1>
            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              <span className="text-white/80 font-semibold">{review.authorNickname}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/50">{new Date(review.createdAt).toLocaleString("ko-KR")}</span>
              <span className="text-white/30">·</span>
              <span className="flex items-center gap-1 text-white/60">
                <MapPin size={11} /> {review.shopName}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-white/40">
                <Eye size={11} /> {viewCount}
              </span>
            </div>
          </header>

          {/* 사진 */}
          {(review.mainPhoto || review.photos.length > 0) && (
            <div className="px-6 pt-6">
              {review.mainPhoto && (
                <div className="rounded-xl overflow-hidden bg-[#1a1a2e]">
                  <img src={review.mainPhoto} alt={review.title}
                    className="w-full h-auto max-h-[480px] object-cover" />
                </div>
              )}
              {review.photos.filter((p) => p !== review.mainPhoto).length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                  {review.photos.filter((p) => p !== review.mainPhoto).map((p, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-[#1a1a2e]">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 본문 */}
          <div className="px-6 py-6 text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">
            {review.content}
          </div>

          {/* 평점 박스 */}
          <div className="mx-6 mb-4 p-5 bg-gradient-to-br from-yellow-400/5 to-orange-500/5 border border-yellow-400/30 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/60 font-semibold">상세 평가</span>
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-extrabold text-yellow-400">{avg.toFixed(1)}</span>
                <span className="text-xs text-white/40">/ 5</span>
              </div>
            </div>
            <div className="space-y-2">
              <StarBar label="시설"   value={review.ratingFacility} />
              <StarBar label="서비스" value={review.ratingService} />
              <StarBar label="가격"   value={review.ratingPrice} />
            </div>
          </div>

          {/* 태그 */}
          {review.tags.length > 0 && (
            <div className="px-6 pb-6 flex flex-wrap gap-2">
              {review.tags.map((t) => (
                <span key={t}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-400/10 text-yellow-300 text-xs font-medium rounded-full border border-yellow-400/20">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* 작성자 / 관리자 액션 */}
          {canEdit && (
            <div className="px-6 py-3 border-t border-white/10 flex items-center justify-end gap-2">
              <Link
                href={`/reviews/${review.id}/edit`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10 transition-colors"
              >
                <Pencil size={11} /> 수정
              </Link>
              <DeleteReviewButton reviewId={review.id} />
            </div>
          )}
        </article>

        <p className="mt-4 text-center text-[11px] text-white/40 flex items-center justify-center gap-1">
          <Calendar size={11} />
          {review.createdAt !== review.updatedAt && `최종 수정 ${new Date(review.updatedAt).toLocaleDateString("ko-KR")}`}
        </p>
      </div>
    </div>
  );
}
