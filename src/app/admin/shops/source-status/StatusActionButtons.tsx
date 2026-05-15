"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setShopSourceStatus } from "@/lib/actions/source-status";

type Status = "ACTIVE" | "MISSING" | "DELETED_CONFIRMED" | "ARCHIVED";

export default function StatusActionButtons({
  shopId,
  currentStatus,
}: { shopId: number; currentStatus: Status }) {
  const [pending, startTrans] = useTransition();
  const router = useRouter();

  const set = (s: Status) => {
    if (pending) return;
    startTrans(async () => {
      const r = await setShopSourceStatus(shopId, s);
      if (!r.ok) { alert(r.error); return; }
      router.refresh();
    });
  };

  const Btn = ({ label, status, color }: { label: string; status: Status; color: string }) =>
    currentStatus === status ? null : (
      <button
        onClick={() => set(status)}
        disabled={pending}
        className={[
          "px-2 py-1 rounded text-[10px] font-semibold border transition-all disabled:opacity-40",
          color,
        ].join(" ")}
      >
        {label}
      </button>
    );

  return (
    <div className="inline-flex gap-1">
      <Btn label="ACTIVE 복구"   status="ACTIVE"            color="bg-green-50 text-green-700 border-green-200 hover:bg-green-100" />
      <Btn label="DELETED"       status="DELETED_CONFIRMED" color="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"       />
      <Btn label="ARCHIVED"      status="ARCHIVED"          color="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"   />
    </div>
  );
}
