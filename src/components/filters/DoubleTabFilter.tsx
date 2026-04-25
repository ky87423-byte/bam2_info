"use client";

import { MapPin, Tag } from "lucide-react";
import { useFilterParams, type FilterProps } from "./filterUtils";

/**
 * Type A — 2단 탭
 * 지역 칩 한 줄 + 업종 칩 한 줄. 가장 직관적·기본형.
 * 모바일: 가로 스크롤 + 44px+ 터치 타겟.
 */
export default function DoubleTabFilter({ areas, categories }: FilterProps) {
  const { area, category, update } = useFilterParams();

  return (
    <div className="space-y-3">
      <Row icon={MapPin} label="지역">
        <Chip selected={!area} onClick={() => update({ area: "" })}>전체</Chip>
        {areas.map((a) => (
          <Chip key={a.name} selected={area === a.name} onClick={() => update({ area: a.name })}>
            {a.name}
            <CountBadge>{a.count}</CountBadge>
          </Chip>
        ))}
      </Row>

      <Row icon={Tag} label="업종">
        <Chip selected={!category} onClick={() => update({ category: "" })}>전체</Chip>
        {categories.map((c) => (
          <Chip key={c.code} selected={category === c.code} onClick={() => update({ category: c.code })}>
            #{c.code}
            <CountBadge>{c.count}</CountBadge>
          </Chip>
        ))}
      </Row>
    </div>
  );
}

function Row({
  icon: Icon, label, children,
}: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] text-yellow-400 font-bold mb-1.5">
        <Icon size={12} />
        {label}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {children}
      </div>
    </div>
  );
}

function Chip({ selected, onClick, children }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-manipulation",
        selected
          ? "bg-yellow-400 text-black shadow-md"
          : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] opacity-60 tabular-nums">{children}</span>
  );
}
