import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserById, getAreas, getBizTypes } from "@/lib/data";
import { ChevronLeft, Tag } from "lucide-react";
import ShopCouponForm from "../ShopCouponForm";

export default async function NewShopCouponPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await getUserById(parseInt(session.user.id));
  if (!user) redirect("/login");
  if (user.role !== "shop" && user.role !== "admin") redirect("/");

  const areas    = getAreas();
  const bizTypes = getBizTypes().map((b) => b.name);

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
          <Tag size={18} className="text-green-500" />
          새 쿠폰 등록
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          쿠폰 게시판에 노출되며, 회원이 상세 페이지 안의 [쿠폰 받기] 버튼으로 수령합니다.
        </p>
      </div>
      <ShopCouponForm areas={areas} bizTypes={bizTypes} />
    </div>
  );
}
