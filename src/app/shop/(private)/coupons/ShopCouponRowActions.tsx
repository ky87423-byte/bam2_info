"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { actionShopDeleteCoupon, actionShopToggleCouponActive } from "@/lib/actions/coupon";
import type { CouponData } from "@/lib/data";

export default function ShopCouponRowActions({ coupon }: { coupon: CouponData }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!confirm(`"${coupon.title}" 쿠폰을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const r = await actionShopDeleteCoupon(coupon.id);
      if (r?.error) { alert(r.error); return; }
      router.refresh();
    });
  };

  const handleToggle = () => {
    startTransition(async () => {
      const r = await actionShopToggleCouponActive(coupon.id, !coupon.isActive);
      if (r?.error) { alert(r.error); return; }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={handleToggle}
        disabled={pending}
        title={coupon.isActive ? "비활성화" : "활성화"}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
          coupon.isActive ? "bg-green-500" : "bg-gray-300"
        }`}
      >
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
          coupon.isActive ? "translate-x-5" : "translate-x-1"
        }`} />
      </button>
      <Link
        href={`/shop/coupons/${coupon.id}/edit`}
        className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        title="수정"
      >
        <Pencil size={11} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
        title="삭제"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
