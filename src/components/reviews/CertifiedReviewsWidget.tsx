import Link from "next/link";
import { ShieldCheck, Star, ChevronRight, MessageSquare } from "lucide-react";
import { getCertifiedReviewsForShop } from "@/lib/data";

interface Props {
  shopName: string;
  limit?:   number;
}

export default function CertifiedReviewsWidget({ shopName, limit = 6 }: Props) {
  if (!shopName) return null;
  const reviews = getCertifiedReviewsForShop(shopName, limit);
  if (reviews.length === 0) return null;

  return (
    <section className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <ShieldCheck size={18} className="text-orange-500" />
        <h3 className="font-bold text-gray-800 text-sm">실제 방문 인증 후기</h3>
        <span className="text-xs text-gray-400">{reviews.length}건</span>
        <Link
          href={`/reviews?q=${encodeURIComponent(shopName)}&certified=1`}
          className="ml-auto inline-flex items-center gap-0.5 text-xs text-yellow-700 hover:text-yellow-800 font-semibold"
        >
          전체 보기 <ChevronRight size={12} />
        </Link>
      </header>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {reviews.map((r) => {
          const avg = (r.ratingFacility + r.ratingService + r.ratingPrice) / 3;
          return (
            <Link
              key={r.id}
              href={`/reviews/${r.id}`}
              className="bg-gray-50 hover:bg-white rounded-xl p-3 border border-gray-100 hover:border-yellow-200 hover:shadow-sm transition-all flex gap-3 group"
            >
              {/* 썸네일 */}
              <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative">
                {r.mainPhoto ? (
                  <img src={r.mainPhoto} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MessageSquare size={20} className="text-gray-300" />
                  </div>
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[9px] font-bold text-center py-0.5">
                  인증
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{r.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{r.content}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-700">{avg.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{r.authorNickname}</span>
                </div>
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
