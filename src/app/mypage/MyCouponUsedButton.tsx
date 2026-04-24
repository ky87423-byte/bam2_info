"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionMarkCouponUsed } from "@/lib/actions/coupon";

export default function MyCouponUsedButton({ userCouponId }: { userCouponId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleUse = () => {
    if (!confirm("쿠폰을 사용 처리하시겠습니까?")) return;
    startTransition(async () => {
      await actionMarkCouponUsed(userCouponId);
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleUse}
      disabled={pending}
      className="text-xs px-2.5 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
    >
      {pending ? "처리 중" : "사용하기"}
    </button>
  );
}
