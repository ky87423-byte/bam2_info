import Link from "next/link";
import Image from "next/image";
import type { ShopData } from "@/lib/data";
import { Eye, Phone } from "lucide-react";

interface Props {
  shop: ShopData;
}

export default function ShopCard({ shop }: Props) {
  const areaClean = shop.area.replace(/,+$/, "").trim();
  const priceLabel = shop.price > 0 ? `${(shop.price / 10000).toFixed(0)}만원` : "";

  return (
    <Link
      href={`/shop/${shop.id}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow hover:shadow-md transition-shadow border border-gray-100"
    >
      <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
        {shop.mainPhoto ? (
          <Image
            src={shop.mainPhoto}
            alt={shop.company}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            사진 없음
          </div>
        )}
        {areaClean && (
          <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {areaClean}
          </span>
        )}
        {priceLabel && (
          <span className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
            {priceLabel}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-semibold text-gray-900 truncate text-sm">{shop.company}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{shop.subject}</p>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
          {shop.hit > 0 && (
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {shop.hit.toLocaleString()}
            </span>
          )}
          {shop.phone && (
            <span className="flex items-center gap-1 text-blue-500 truncate ml-auto">
              <Phone size={12} />
              {shop.phone}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
