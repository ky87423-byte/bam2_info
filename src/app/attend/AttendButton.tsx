"use client";

import { useTransition, useState } from "react";
import { attendAction } from "@/lib/actions/auth";
import { notifyBadge } from "@/lib/useLiveBadge";
import { CheckCircle, Calendar } from "lucide-react";

interface Props {
  userId: number;
  alreadyChecked: boolean;
}

export default function AttendButton({ userId, alreadyChecked }: Props) {
  const [done, setDone] = useState(alreadyChecked);
  const [result, setResult] = useState<{ pointAwarded: number; streak: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAttend = () => {
    startTransition(async () => {
      const res = await attendAction(userId);
      if (res.ok) {
        setDone(true);
        setResult({ pointAwarded: res.pointAwarded, streak: res.streak });
        notifyBadge("points");   // 헤더 포인트 배지 즉시 갱신 (다른 탭 포함)
      }
    });
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle size={20} className="text-green-500" />
        <div>
          <p className="text-sm font-semibold text-green-700">오늘 출석 완료!</p>
          {result && (
            <p className="text-xs text-green-600">
              +{result.pointAwarded}P 지급 · {result.streak}일 연속
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleAttend}
      disabled={pending}
      className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-60 shadow-sm"
    >
      <Calendar size={18} />
      {pending ? "처리 중..." : "출석하기"}
    </button>
  );
}
