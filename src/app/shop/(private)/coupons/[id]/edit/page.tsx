import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserById, getCoupons, getAreas, getBizTypes } from "@/lib/data";
import { ChevronLeft, Tag } from "lucide-react";
import ShopCouponForm from "../../ShopCouponForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditShopCouponPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);
  if (!user) redirect("/login");
  if (user.role !== "shop" && user.role !== "admin") redirect("/");

  const { id } = await params;
  const couponId = parseInt(id);
  const coupon = getCoupons().find((c) => c.id === couponId);
  if (!coupon) notFound();
  if (user.role === "shop" && coupon.ownerUserId !== userId) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
        본인이 등록한 쿠폰만 수정할 수 있습니다.
      </div>
    );
  }

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
          쿠폰 수정
        </h1>
      </div>
      <ShopCouponForm coupon={coupon} areas={getAreas()} bizTypes={getBizTypes().map((b) => b.name)} />
    </div>
  );
}
