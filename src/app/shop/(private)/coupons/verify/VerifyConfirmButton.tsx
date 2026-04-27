"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { actionMarkCouponUsed } from "@/lib/actions/coupon";

export default function VerifyConfirmButton({
  userCouponId,
  userNickname,
}: {
  userCouponId: number;
  userNickname: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    if (!confirm(`${userNickname} 회원의 쿠폰을 [사용 확인] 처리하시겠습니까?\n처리 후에는 되돌릴 수 없습니다.`)) {
      return;
    }
    startTransition(async () => {
      const r = await actionMarkCouponUsed(userCouponId);
      if (r?.error) { alert(r.error); return; }
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleConfirm}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
    >
      <CheckCircle size={14} />
      {pending ? "처리 중..." : "사용 확인"}
    </button>
  );
}
