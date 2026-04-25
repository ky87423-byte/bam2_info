"use client";

import { useState, useTransition } from "react";
import { LayoutGrid, List, Table, Check } from "lucide-react";
import { setMainLayoutAction } from "@/lib/actions/siteConfig";

type LayoutValue = "GRID" | "LIST_CARD" | "BOARD";

const OPTIONS: Array<{ value: LayoutValue; label: string; desc: string; icon: React.ElementType }> = [
  { value: "GRID",      label: "그리드",     desc: "썸네일 카드 다열 (기본 — 시각적, 모바일 친화)", icon: LayoutGrid },
  { value: "LIST_CARD", label: "리스트 카드", desc: "한 줄당 한 업소, 가로형 (정보량 ↑)",            icon: List },
  { value: "BOARD",     label: "게시판",     desc: "테이블형 (밀도 최대, PC 친화)",                  icon: Table },
];

interface Props {
  initialLayout: LayoutValue;
}

export default function MainLayoutSwitcher({ initialLayout }: Props) {
  const [active,  setActive]  = useState<LayoutValue>(initialLayout);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTrans] = useTransition();

  const choose = (value: LayoutValue) => {
    if (value === active) return;
    setError(null); setSaved(false);
    startTrans(async () => {
      const res = await setMainLayoutAction(value);
      if (!res.ok) { setError(res.error); return; }
      setActive(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {OPTIONS.map(({ value, label, desc, icon: Icon }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => choose(value)}
              disabled={pending}
              className={[
                "relative text-left px-4 py-3 rounded-xl ring-2 transition-all disabled:opacity-50",
                isActive
                  ? "bg-indigo-50 ring-indigo-400 shadow-sm"
                  : "bg-white ring-gray-200 hover:ring-gray-300 hover:bg-gray-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-2.5">
                <div className={[
                  "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  isActive ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500",
                ].join(" ")}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={[
                    "text-sm font-bold leading-tight",
                    isActive ? "text-indigo-700" : "text-gray-700",
                  ].join(" ")}>
                    {label}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{desc}</p>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      {saved && (
        <p className="mt-3 text-xs text-green-600 inline-flex items-center gap-1">
          <Check size={12} /> 저장됐습니다 — 메인 페이지 즉시 적용
        </p>
      )}
    </div>
  );
}
