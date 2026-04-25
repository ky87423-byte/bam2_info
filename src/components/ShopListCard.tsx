import Link from "next/link";
import Image from "next/image";
import type { ShopData } from "@/lib/data";
import { MapPin, Tag, Eye, Clock } from "lucide-react";

interface Props {
  shop: ShopData;
}

/** 가로 리스트 카드 — 한 행에 한 업소, 썸네일 + 정보 */
export default function ShopListCard({ shop }: Props) {
  const areaClean = shop.area.replace(/,+$/, "").trim();
  const priceLabel = shop.price > 0 ? `${(shop.price / 10000).toFixed(0)}만원` : "";
  const timeLabel = shop.timeFull
    ? "24시간"
    : shop.time1 && shop.time2 ? `${shop.time1}~${shop.time2}` : "";

  return (
    <Link
      href={`/shop/${shop.id}`}
      className="group flex bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md ring-1 ring-gray-100 transition-all"
    >
      {/* 썸네일 */}
      <div className="relative w-28 sm:w-36 h-28 sm:h-32 shrink-0 bg-gray-100">
        {shop.mainPhoto ? (
          <Image
            src={shop.mainPhoto}
            alt={shop.company}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="(max-width: 640px) 112px, 144px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">no img</div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-gray-800 truncate group-hover:text-indigo-600">
            {shop.company}
          </h3>
          {shop.subject && (
            <p className="mt-0.5 text-xs text-gray-500 truncate">{shop.subject}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 mt-2">
          {areaClean && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin size={10} className="text-blue-500" /> {areaClean}
            </span>
          )}
          {shop.category && (
            <span className="inline-flex items-center gap-0.5">
              <Tag size={10} className="text-green-500" /> {shop.category}
            </span>
          )}
          {timeLabel && (
            <span className="inline-flex items-center gap-0.5">
              <Clock size={10} className="text-purple-500" /> {timeLabel}
            </span>
          )}
          {shop.hit > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Eye size={10} /> {shop.hit.toLocaleString()}
            </span>
          )}
          {priceLabel && (
            <span className="ml-auto inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded">
              {priceLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
