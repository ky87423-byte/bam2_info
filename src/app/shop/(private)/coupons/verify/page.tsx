import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById, searchShopUserCoupons, couponLabel } from "@/lib/data";
import { ChevronLeft, ScanLine, Search, Tag, Clock } from "lucide-react";
import VerifyConfirmButton from "./VerifyConfirmButton";

interface Props {
  searchParams: Promise<{ q?: string; includeUsed?: string }>;
}

export default async function ShopCouponVerifyPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);
  if (!user) redirect("/login");
  if (user.role !== "shop" && user.role !== "admin") {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
        업소회원만 사용할 수 있습니다.
      </div>
    );
  }

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const includeUsed = params.includeUsed === "1";

  const results = q ? await searchShopUserCoupons({ ownerUserId: userId, q, includeUsed }) : [];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/shop/coupons"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ChevronLeft size={14} />
          쿠폰 목록
        </Link>
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ScanLine size={18} className="text-emerald-500" />
          쿠폰 사용 확인
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          손님이 제시한 닉네임 또는 예약 코드로 검색한 뒤 [사용 확인] 버튼을 눌러주세요.
        </p>
      </div>

      <form method="GET" action="/shop/coupons/verify" className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px] flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400">
            <Search size={14} className="text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="닉네임 또는 예약 코드 (예: A2K9JM7Q)"
              className="flex-1 text-sm outline-none"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              name="includeUsed"
              value="1"
              defaultChecked={includeUsed}
              className="w-3.5 h-3.5 accent-emerald-500"
            />
            이미 사용된 것도 표시
          </label>
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"
          >
            검색
          </button>
        </div>
      </form>

      {!q ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
          <ScanLine size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm">검색어를 입력하세요.</p>
          <p className="text-xs text-gray-400 mt-1">예약 코드는 8자 영숫자입니다.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
          <p className="text-sm">검색 결과가 없습니다.</p>
          <p className="text-xs mt-1">코드를 다시 확인하거나 닉네임의 일부만 입력해보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => {
            const used = !!r.userCoupon.usedAt;
            return (
              <div
                key={r.userCoupon.id}
                className={`bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 ${used ? "opacity-60" : ""}`}
              >
                <div className="shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center text-white">
                  <Tag size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-800 truncate">{r.coupon.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                      {couponLabel(r.coupon)}
                    </span>
                    {used && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">
                        사용 완료
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{r.user.nickname}</span>
                    <span className="text-gray-400"> ({r.user.username})</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {r.userCoupon.reservationCode ?? "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      받은 날짜 {r.userCoupon.claimedAt}
                    </span>
                    {used && (
                      <span className="text-gray-500">사용 처리: {r.userCoupon.usedAt}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {used ? (
                    <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm">
                      처리 완료
                    </span>
                  ) : (
                    <VerifyConfirmButton userCouponId={r.userCoupon.id} userNickname={r.user.nickname} />
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
