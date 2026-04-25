"use client";

import { useState } from "react";
import { MapPin, Tag, X } from "lucide-react";
import { useFilterParams, type FilterProps } from "./filterUtils";

type Tab = "AREA" | "CATEGORY";

/**
 * Type D — 탭 스위칭
 * 상단 [업종 / 지역] 토글 버튼 → 선택된 탭의 칩 그리드만 표시.
 * 활성 필터(area·category)는 토글 위에 작게 노출 (현재 선택 시각화).
 */
export default function TabSwitchFilter({ areas, categories }: FilterProps) {
  const { area, category, update } = useFilterParams();
  const [tab, setTab] = useState<Tab>(category ? "CATEGORY" : "AREA");
  const hasFilter = !!area || !!category;

  return (
    <div className="space-y-3">
      {/* 탭 토글 */}
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-white/10 rounded-xl p-1">
          <TabButton active={tab === "AREA"}     onClick={() => setTab("AREA")}     icon={MapPin} label="지역" />
          <TabButton active={tab === "CATEGORY"} onClick={() => setTab("CATEGORY")} icon={Tag}    label="업종" />
        </div>

        {/* 현재 선택 칩들 (없으면 안 보임) */}
        {area && (
          <ActiveChip onRemove={() => update({ area: "" })}>
            <MapPin size={10} /> {area}
          </ActiveChip>
        )}
        {category && (
          <ActiveChip onRemove={() => update({ category: "" })}>
            <Tag size={10} /> #{category}
          </ActiveChip>
        )}
        {hasFilter && (
          <button
            type="button"
            onClick={() => update({ area: "", category: "" })}
            className="ml-auto text-[11px] text-white/60 hover:text-yellow-400 transition-colors"
          >
            전체 해제
          </button>
        )}
      </div>

      {/* 칩 그리드 (선택된 탭만 렌더) */}
      {tab === "AREA" ? (
        <ChipGrid>
          <Chip selected={!area} onClick={() => update({ area: "" })}>전체</Chip>
          {areas.map((a) => (
            <Chip key={a.name} selected={area === a.name} onClick={() => update({ area: a.name })}>
              {a.name}
              <Count>{a.count}</Count>
            </Chip>
          ))}
        </ChipGrid>
      ) : (
        <ChipGrid>
          <Chip selected={!category} onClick={() => update({ category: "" })}>전체</Chip>
          {categories.map((c) => (
            <Chip key={c.code} selected={category === c.code} onClick={() => update({ category: c.code })}>
              #{c.code}
              <Count>{c.count}</Count>
            </Chip>
          ))}
        </ChipGrid>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold transition-all touch-manipulation",
        active
          ? "bg-yellow-400 text-black shadow-sm"
          : "text-white/60 hover:text-white",
      ].join(" ")}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function ActiveChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/15 text-yellow-200 text-[11px] font-semibold">
      {children}
      <button onClick={onRemove} className="ml-0.5 hover:text-yellow-100">
        <X size={10} />
      </button>
    </span>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
      {children}
    </div>
  );
}

function Chip({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-11 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all touch-manipulation",
        selected
          ? "bg-yellow-400 text-black shadow-md scale-[1.02]"
          : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] opacity-60 tabular-nums">{children}</span>;
}
