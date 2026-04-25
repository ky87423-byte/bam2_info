"use client";

import { useState, useTransition } from "react";
import { Rows, ChevronDown, PanelLeft, ToggleRight, Check } from "lucide-react";
import { setFilterLayoutAction } from "@/lib/actions/siteConfig";

type Value = "DOUBLE_TAB" | "DROPDOWN" | "SIDEBAR" | "TAB_SWITCH";

const OPTIONS: Array<{ value: Value; label: string; desc: string; icon: React.ElementType }> = [
  { value: "DOUBLE_TAB", label: "2단 탭",      desc: "지역 칩 + 업종 칩 두 줄 (기본 — 직관적)", icon: Rows         },
  { value: "DROPDOWN",   label: "드롭다운",    desc: "셀렉트 박스 2개 (정보량 적음, 깔끔)",     icon: ChevronDown  },
  { value: "SIDEBAR",    label: "사이드바",    desc: "좌측 컬럼 (페이지 구조 변경, 데스크탑↑)", icon: PanelLeft    },
  { value: "TAB_SWITCH", label: "탭 스위치",   desc: "[업종/지역] 토글로 칩 그리드 교체",        icon: ToggleRight  },
];

interface Props {
  initialFilter: Value;
}

export default function FilterLayoutSwitcher({ initialFilter }: Props) {
  const [active,  setActive]  = useState<Value>(initialFilter);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTrans] = useTransition();

  const choose = (value: Value) => {
    if (value === active) return;
    setError(null); setSaved(false);
    startTrans(async () => {
      const res = await setFilterLayoutAction(value);
      if (!res.ok) { setError(res.error); return; }
      setActive(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  ? "bg-yellow-50 ring-yellow-400 shadow-sm"
                  : "bg-white ring-gray-200 hover:ring-gray-300 hover:bg-gray-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-2.5">
                <div className={[
                  "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  isActive ? "bg-black text-yellow-400" : "bg-gray-100 text-gray-500",
                ].join(" ")}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={[
                    "text-sm font-bold leading-tight",
                    isActive ? "text-black" : "text-gray-700",
                  ].join(" ")}>
                    {label}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{desc}</p>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center">
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
