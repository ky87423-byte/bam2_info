"use client";

import { useTransition, useState } from "react";
import { actionClaimCoupon } from "@/lib/actions/coupon";
import { Gift } from "lucide-react";

interface Props {
  couponId: number;
  claimed: boolean;
  loggedIn: boolean;
}

export default function ClaimButton({ couponId, claimed: initialClaimed, loggedIn }: Props) {
  const [pending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(initialClaimed);
  const [error, setError] = useState("");

  if (!loggedIn) {
    return (
      <a href="/login"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition-colors">
        <Gift size={14} />
        로그인 후 받기
      </a>
    );
  }

  if (claimed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
        <Gift size={14} />
        받기 완료
      </span>
    );
  }

  const handleClaim = () => {
    setError("");
    startTransition(async () => {
      const result = await actionClaimCoupon(couponId);
      if (result.error) setError(result.error);
      else setClaimed(true);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClaim}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        <Gift size={14} />
        {pending ? "처리 중..." : "쿠폰 받기"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
