import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Clock, Eye, DollarSign, ChevronLeft } from "lucide-react";
import { getShopById } from "@/lib/data";
import { recordAnalyticsEvent, extractIpFromHeaders } from "@/lib/api/events";
import { incrementView } from "@/lib/viewTracker";
import { EventType } from "@/generated/prisma/enums";
import ContactButtons from "./ContactButtons";
import ClaimListingBanner from "@/components/shop/ClaimListingBanner";
import InquiryButton from "@/components/shop/InquiryButton";
import CommentSection from "@/components/comments/CommentSection";
import CertifiedReviewsWidget from "@/components/reviews/CertifiedReviewsWidget";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
  const { id } = await params;
  const shopId = parseInt(id, 10);
  if (isNaN(shopId)) notFound();

  const shop = getShopById(shopId);
  if (!shop) notFound();

  // VIEW 이벤트 기록 + 조회수 +1 (둘 다 1시간 IP dedup. 실패해도 페이지 렌더링 중단 안 함)
  try {
    const reqHeaders = await headers();
    const ipAddress = extractIpFromHeaders(reqHeaders);
    incrementView("shop", shopId, ipAddress);     // file-based, 카드/상세 조회수 표시용
    await recordAnalyticsEvent({ storeId: shopId, eventType: EventType.VIEW, ipAddress });
  } catch {
    // DB 미연결 시 무시
  }

  // /shop/[id] 의 모든 데이터는 현재 스크래퍼 출처 (data/shops.json) → 클레임 배너 노출.
  // 추후 회원이 직접 등록한 Shop이 생기면 isScraped 플래그로 분기.
  const isScraped = true;

  const areaClean = shop.area.replace(/,+$/, "").trim();
  const allPhotos = [
    ...(shop.mainPhoto ? [shop.mainPhoto] : []),
    ...(shop.photos ?? []),
  ];
  const priceLabel = shop.price > 0 ? `${(shop.price / 10000).toFixed(0)}만원` : "";
  const timeLabel = shop.timeFull
    ? "24시간 영업"
    : shop.time1 && shop.time2
    ? `${shop.time1} ~ ${shop.time2}`
    : "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ChevronLeft size={16} /> 목록으로
      </Link>

      {/* 스크랩 업소 클레임 배너 (Phase 1 — 안내 모달, 클레임 폼은 Phase 2) */}
      {isScraped && <ClaimListingBanner shopId={shop.id} company={shop.company} />}

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{shop.company}</h1>
            {areaClean && (
              <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {areaClean}
              </span>
            )}
          </div>
          {priceLabel && (
            <span className="shrink-0 bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded-full">
              {priceLabel}
            </span>
          )}
        </div>

        {shop.subject && (
          <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap">
            {shop.subject}
          </p>
        )}

        {/* 전화/텔레그램 버튼 — 클릭 시 CALL 이벤트 기록 */}
        <ContactButtons
          storeId={shopId}
          phone={shop.phone}
          hphone={shop.hphone}
          telegram={shop.telegram}
        />

        {/* 운영자 통한 문의 (스크랩 업소 = 가상 user → AdminInquiry 우회) */}
        {isScraped && (
          <div className="mt-3">
            <InquiryButton shopId={shop.id} company={shop.company} />
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
          {timeLabel && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {timeLabel}
            </span>
          )}
          {shop.hit > 0 && (
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              조회 {shop.hit.toLocaleString()}
            </span>
          )}
          {priceLabel && (
            <span className="flex items-center gap-1.5">
              <DollarSign size={14} />
              {priceLabel}
            </span>
          )}
        </div>

        {allPhotos.length > 0 && (
          <div className="flex flex-col gap-3">
            {allPhotos.map((photo, i) => (
              <div key={i} className="relative w-full rounded-xl overflow-hidden bg-gray-100">
                <Image
                  src={photo}
                  alt={`${shop.company} 사진 ${i + 1}`}
                  width={800}
                  height={600}
                  className="w-full h-auto object-contain"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 인증 후기 위젯 — 같은 shopName 매칭 */}
      <CertifiedReviewsWidget shopName={shop.company} />

      {/* 댓글 섹션 — targetType="shop" 으로 /posts 의 promotion 댓글과 분리 */}
      <CommentSection boardType="shop" postId={shop.id} />
    </div>
  );
}
