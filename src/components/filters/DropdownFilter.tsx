"use client";

import { MapPin, Tag, X } from "lucide-react";
import { useFilterParams, type FilterProps } from "./filterUtils";

/**
 * Type B — 드롭다운 (계층 연동)
 *   광역 select → 세부 select 옵션 동적 갱신.
 *   광역 미선택 시 세부 select 비활성화.
 */
export default function DropdownFilter({ regionGroups, bizTypes }: FilterProps) {
  const { region, area, bizType, update } = useFilterParams();
  const activeGroup = regionGroups.find((g) => g.code === region);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 광역 */}
      <Select
        icon={MapPin}
        label="광역"
        value={region}
        onChange={(v) => update({ region: v, area: "" })}
      >
        <option value="">전체 지역</option>
        {regionGroups.map((g) => (
          <option key={g.code} value={g.code}>{g.name} ({g.count})</option>
        ))}
      </Select>

      {/* 세부 — 광역 선택 시에만 활성화 */}
      <Select
        icon={MapPin}
        label="세부"
        value={area}
        onChange={(v) => update({ area: v })}
        disabled={!activeGroup}
      >
        <option value="">{activeGroup ? `${activeGroup.name} 전체` : "광역 먼저 선택"}</option>
        {activeGroup?.areas.map((a) => (
          <option key={a.name} value={a.name}>{a.name} ({a.count})</option>
        ))}
      </Select>

      {/* 업종 */}
      <Select
        icon={Tag}
        label="업종"
        value={bizType}
        onChange={(v) => update({ bizType: v })}
      >
        <option value="">전체 업종</option>
        {bizTypes.map((b) => (
          <option key={b.name} value={b.name}>{b.name} ({b.count})</option>
        ))}
      </Select>

      {(region || area || bizType) && (
        <button
          type="button"
          onClick={() => update({ region: "", area: "", bizType: "" })}
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
  icon: Icon, label, value, onChange, disabled, children,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon size={13} className={[
        "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
        disabled ? "text-white/25" : "text-yellow-400",
      ].join(" ")} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
        className={[
          "appearance-none h-11 pl-8 pr-9 rounded-xl bg-white/10 border text-sm font-semibold focus:outline-none cursor-pointer touch-manipulation",
          // option 패널은 OS 가 그리며 select 의 bg-white/10 가 그대로 적용 안 됨 →
          // 자식 option 에 명시적으로 다크 배경 + 흰 글자 강제 (모든 브라우저 호환)
          "[&_option]:bg-[#1a1a2e] [&_option]:text-white [&_option]:font-semibold",
          disabled
            ? "border-white/10 text-white/30 cursor-not-allowed"
            : "border-white/20 text-white focus:border-yellow-400",
        ].join(" ")}
      >
        {children}
      </select>
      <svg className={[
        "absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none",
        disabled ? "text-white/20" : "text-white/60",
      ].join(" ")} viewBox="0 0 12 8" fill="none">
        <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
