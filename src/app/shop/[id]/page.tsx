import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Clock, Eye, DollarSign, ChevronLeft } from "lucide-react";
import { getShopById } from "@/lib/data";
import { recordAnalyticsEvent, extractIpFromHeaders } from "@/lib/api/events";
import { EventType } from "@/generated/prisma/enums";
import ContactButtons from "./ContactButtons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
  const { id } = await params;
  const shopId = parseInt(id, 10);
  if (isNaN(shopId)) notFound();

  const shop = getShopById(shopId);
  if (!shop) notFound();

  // VIEW 이벤트 기록 (실패해도 페이지 렌더링 중단 안 함)
  try {
    const reqHeaders = await headers();
    const ipAddress = extractIpFromHeaders(reqHeaders);
    await recordAnalyticsEvent({ storeId: shopId, eventType: EventType.VIEW, ipAddress });
  } catch {
    // DB 미연결 시 무시
  }

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
    </div>
  );
}
