"use client";

import { MapPin, Tag, X } from "lucide-react";
import { useFilterParams, type FilterProps } from "./filterUtils";

/**
 * Type C — 사이드바
 * 좌측 컬럼에 세로 리스트로 모든 필터 노출.
 * 데스크탑(lg↑): aside 사이드바 / 모바일: 상단 펼침 영역.
 * (페이지 구조 변경: page.tsx 의 SIDEBAR 분기에서 다른 그리드 컨테이너 사용)
 */
export default function SidebarFilter({ areas, bizTypes }: FilterProps) {
  const { area, bizType, update } = useFilterParams();
  const hasFilter = !!area || !!bizType;

  return (
    <div className="bg-white/5 rounded-2xl ring-1 ring-white/10 p-4 lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-yellow-400">필터</h3>
        {hasFilter && (
          <button
            type="button"
            onClick={() => update({ area: "", bizType: "" })}
            className="inline-flex items-center gap-0.5 text-[10px] text-white/60 hover:text-yellow-400 transition-colors"
          >
            <X size={10} /> 초기화
          </button>
        )}
      </div>

      <Section icon={MapPin} label="지역">
        <Item selected={!area} onClick={() => update({ area: "" })} count={null}>전체</Item>
        {areas.map((a) => (
          <Item
            key={a.name}
            selected={area === a.name}
            onClick={() => update({ area: a.name })}
            count={a.count}
          >
            {a.name}
          </Item>
        ))}
      </Section>

      <Section icon={Tag} label="업종">
        <Item selected={!bizType} onClick={() => update({ bizType: "" })} count={null}>전체</Item>
        {bizTypes.map((b) => (
          <Item
            key={b.name}
            selected={bizType === b.name}
            onClick={() => update({ bizType: b.name })}
            count={b.count}
          >
            {b.name}
          </Item>
        ))}
      </Section>
    </div>
  );
}

function Section({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 mb-1.5">
        <Icon size={11} /> {label}
      </h4>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Item({ selected, onClick, count, children }: {
  selected: boolean;
  onClick: () => void;
  count: number | null;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          "w-full min-h-9 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors touch-manipulation",
          selected
            ? "bg-yellow-400 text-black font-bold"
            : "text-white/70 hover:text-white hover:bg-white/10",
        ].join(" ")}
      >
        <span className="truncate">{children}</span>
        {count !== null && (
          <span className={["text-[10px] tabular-nums shrink-0", selected ? "text-black/60" : "text-white/40"].join(" ")}>
            {count}
          </span>
        )}
      </button>
    </li>
  );
}
