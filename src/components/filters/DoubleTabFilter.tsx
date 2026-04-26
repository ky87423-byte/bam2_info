"use client";

import { MapPin, Tag, ChevronRight } from "lucide-react";
import { useFilterParams, type FilterProps } from "./filterUtils";

/**
 * Type A — 2단 탭 (계층화)
 *   1행: 광역 그룹 칩 (서울/경기/인천/...)
 *   2행: 선택된 광역의 세부 지역 칩 (광역 미선택 시 숨김)
 *   3행: 업종 칩
 * 모바일: 가로 스크롤 + 44px+ 터치 타겟.
 */
export default function DoubleTabFilter({ regionGroups, bizTypes }: FilterProps) {
  const { region, area, bizType, update } = useFilterParams();
  const activeGroup = regionGroups.find((g) => g.code === region);

  return (
    <div className="space-y-3">
      <Row icon={MapPin} label="지역">
        <Chip selected={!region && !area} onClick={() => update({ region: "", area: "" })}>전체</Chip>
        {regionGroups.map((g) => (
          <Chip
            key={g.code}
            selected={region === g.code}
            onClick={() => update({ region: g.code, area: "" })}
          >
            {g.name}
            <CountBadge>{g.count}</CountBadge>
          </Chip>
        ))}
      </Row>

      {activeGroup && (
        <Row icon={ChevronRight} label={activeGroup.name + " 세부"}>
          <Chip selected={!area} onClick={() => update({ area: "" })}>전체</Chip>
          {activeGroup.areas.map((a) => (
            <Chip
              key={a.name}
              selected={area === a.name}
              onClick={() => update({ region: activeGroup.code, area: a.name })}
            >
              {a.name}
              <CountBadge>{a.count}</CountBadge>
            </Chip>
          ))}
        </Row>
      )}

      <Row icon={Tag} label="업종">
        <Chip selected={!bizType} onClick={() => update({ bizType: "" })}>전체</Chip>
        {bizTypes.map((b) => (
          <Chip key={b.name} selected={bizType === b.name} onClick={() => update({ bizType: b.name })}>
            {b.name}
            <CountBadge>{b.count}</CountBadge>
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
