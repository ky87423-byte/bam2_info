import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById, getShopCouponStats, couponLabel } from "@/lib/data";
import { Tag, PlusCircle, ScanLine, Users } from "lucide-react";
import ShopCouponRowActions from "./ShopCouponRowActions";

export default async function ShopCouponsPage() {
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

  const coupons = getShopCouponStats(userId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Tag size={18} className="text-green-500" />
            내 쿠폰 관리
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{coupons.length}개 등록됨</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/shop/coupons/verify"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"
          >
            <ScanLine size={14} />
            사용 확인
          </Link>
          <Link
            href="/shop/coupons/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            <PlusCircle size={14} />
            쿠폰 추가
          </Link>
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <Tag size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 mb-3">아직 등록된 쿠폰이 없습니다.</p>
          <Link href="/shop/coupons/new" className="text-sm text-blue-500 hover:underline">
            첫 번째 쿠폰 만들기 →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">쿠폰</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-32">종류</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-28">유효기간</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-32">발급/사용</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-28 text-center">상태</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-28 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c) => (
                <tr key={c.id} className={!c.isActive ? "bg-gray-50/60" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{c.title}</p>
                    {c.description && (
                      <p className="text-xs text-gray-400 truncate max-w-md">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-green-600 font-semibold">
                    {couponLabel(c)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.validUntil || "-"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <p className="flex items-center gap-1">
                      <Users size={11} />
                      {c.claimCount}{c.maxIssue ? ` / ${c.maxIssue}` : " (무제한)"}
                    </p>
                    <p className="text-blue-500 mt-0.5">사용 {c.usedCount}명</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${
                      c.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {c.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ShopCouponRowActions coupon={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
