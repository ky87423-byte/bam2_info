import { auth } from "@/auth";
import { getCoupons, getUserCoupons, getCouponClaimCounts } from "@/lib/data";
import { Tag, Store, Clock } from "lucide-react";
import ClaimButton from "./ClaimButton";

export default async function CouponsPage() {
  const session = await auth();
  const userId   = session?.user?.id ? parseInt(session.user.id) : null;
  const loggedIn = !!userId;

  const today   = new Date().toISOString().slice(0, 10);
  const coupons = getCoupons()
    .filter((c) => (c.type ?? "coupon") === "coupon" && c.isActive && (!c.validUntil || c.validUntil >= today))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const claimedIds = new Set(userId ? getUserCoupons(userId).map((uc) => uc.couponId) : []);
  const counts     = getCouponClaimCounts();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Tag size={22} className="text-green-500" />
        <h1 className="text-2xl font-bold text-gray-800">쿠폰 / 이벤트</h1>
        <span className="text-sm text-gray-400">{coupons.length}개</span>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p>현재 이용 가능한 쿠폰이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const claimCount = counts[coupon.id] ?? 0;
            const isSoldOut  = !!(coupon.maxIssue && coupon.maxIssue > 0 && claimCount >= coupon.maxIssue);
            const claimed    = claimedIds.has(coupon.id);

            return (
              <div key={coupon.id}
                className={`bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 ${isSoldOut && !claimed ? "opacity-60" : ""}`}>
                {/* 좌측 할인 뱃지 */}
                <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex flex-col items-center justify-center text-white shadow-sm">
                  <Tag size={16} className="mb-0.5 opacity-80" />
                  <span className="text-xs font-bold text-center leading-tight px-1">{coupon.discount}</span>
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-bold text-gray-800 truncate">{coupon.title}</h2>
                    {isSoldOut && !claimed && (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full shrink-0">소진</span>
                    )}
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-gray-500 truncate">{coupon.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    {coupon.shopName && (
                      <span className="flex items-center gap-1">
                        <Store size={11} />
                        {coupon.shopName}
                      </span>
                    )}
                    {coupon.validUntil && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {coupon.validUntil} 까지
                      </span>
                    )}
                    {coupon.maxIssue && coupon.maxIssue > 0 ? (
                      <span>{claimCount} / {coupon.maxIssue}명</span>
                    ) : (
                      claimCount > 0 && <span>{claimCount}명 받음</span>
                    )}
                  </div>
                </div>

                {/* 받기 버튼 */}
                <div className="shrink-0">
                  {isSoldOut && !claimed ? (
                    <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm">
                      수량 소진
                    </span>
                  ) : (
                    <ClaimButton couponId={coupon.id} claimed={claimed} loggedIn={loggedIn} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
