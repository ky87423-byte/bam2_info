"use client";

import { MapPin, Tag, X } from "lucide-react";
import { useFilterParams, type FilterProps } from "./filterUtils";

/**
 * Type B — 드롭다운
 * 셀렉트 박스 2개. 데스크탑 친화·정보량 적은 인터페이스.
 */
export default function DropdownFilter({ areas, categories }: FilterProps) {
  const { area, category, update } = useFilterParams();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        icon={MapPin}
        label="지역"
        value={area}
        onChange={(v) => update({ area: v })}
      >
        <option value="">전체 지역</option>
        {areas.map((a) => (
          <option key={a.name} value={a.name}>{a.name} ({a.count})</option>
        ))}
      </Select>

      <Select
        icon={Tag}
        label="업종"
        value={category}
        onChange={(v) => update({ category: v })}
      >
        <option value="">전체 업종</option>
        {categories.map((c) => (
          <option key={c.code} value={c.code}>#{c.code} ({c.count})</option>
        ))}
      </Select>

      {(area || category) && (
        <button
          type="button"
          onClick={() => update({ area: "", category: "" })}
          className="inline-flex items-center gap-1 h-11 px-3 rounded-xl text-xs text-yellow-400 hover:bg-white/10 transition-colors touch-manipulation"
        >
          <X size={12} />
          초기화
        </button>
      )}
    </div>
  );
}

function Select({
  icon: Icon, label, value, onChange, children,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none h-11 pl-8 pr-9 rounded-xl bg-white/10 border border-white/20 text-sm text-white font-semibold focus:outline-none focus:border-yellow-400 cursor-pointer touch-manipulation"
      >
        {children}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/60 pointer-events-none" viewBox="0 0 12 8" fill="none">
        <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
