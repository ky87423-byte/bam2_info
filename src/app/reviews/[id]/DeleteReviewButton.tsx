"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { actionDeleteReview } from "@/lib/actions/review";

export default function DeleteReviewButton({ reviewId }: { reviewId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handle = () => {
    if (!confirm("후기를 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const r = await actionDeleteReview(reviewId);
      if (r?.error) { alert(r.error); return; }
      router.push("/reviews");
      router.refresh();
    });
  };

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      <Trash2 size={11} /> 삭제
    </button>
  );
}
