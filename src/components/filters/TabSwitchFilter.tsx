"use client";

import { useState } from "react";
import { MapPin, Tag, X, ArrowLeft } from "lucide-react";
import { useFilterParams, type FilterProps } from "./filterUtils";

type Tab = "AREA" | "BIZ";

/**
 * Type D — 탭 스위칭 (지역 탭에 2단 hierarchy)
 *   상단 [지역 / 업종] 토글.
 *   지역 탭: 광역 그룹 칩 그리드 → 광역 클릭 시 해당 그룹 세부 칩으로 교체 (← 뒤로 버튼 제공)
 *   업종 탭: 단일 칩 그리드.
 */
export default function TabSwitchFilter({ regionGroups, bizTypes }: FilterProps) {
  const { region, area, bizType, update } = useFilterParams();
  const [tab, setTab] = useState<Tab>(bizType && !region ? "BIZ" : "AREA");
  // 지역 탭 내부 단계: region 선택됐으면 자동으로 세부 단계
  const [showSubAreas, setShowSubAreas] = useState<boolean>(!!region);
  const activeGroup = regionGroups.find((g) => g.code === region);
  const hasFilter = !!region || !!area || !!bizType;

  const activeLabel = area || activeGroup?.name || "";

  return (
    <div className="space-y-3">
      {/* 탭 토글 + 활성 칩 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex bg-white/10 rounded-xl p-1">
          <TabButton active={tab === "AREA"} onClick={() => setTab("AREA")} icon={MapPin} label="지역" />
          <TabButton active={tab === "BIZ"}  onClick={() => setTab("BIZ")}  icon={Tag}    label="업종" />
        </div>

        {activeLabel && (
          <ActiveChip onRemove={() => { update({ region: "", area: "" }); setShowSubAreas(false); }}>
            <MapPin size={10} /> {activeLabel}
          </ActiveChip>
        )}
        {bizType && (
          <ActiveChip onRemove={() => update({ bizType: "" })}>
            <Tag size={10} /> {bizType}
          </ActiveChip>
        )}
        {hasFilter && (
          <button
            type="button"
            onClick={() => { update({ region: "", area: "", bizType: "" }); setShowSubAreas(false); }}
            className="ml-auto text-[11px] text-white/60 hover:text-yellow-400 transition-colors"
          >
            전체 해제
          </button>
        )}
      </div>

      {/* 칩 그리드 */}
      {tab === "AREA" ? (
        showSubAreas && activeGroup ? (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => { setShowSubAreas(false); update({ region: "", area: "" }); }}
                className="inline-flex items-center gap-1 text-[11px] text-yellow-400 hover:text-yellow-300 touch-manipulation"
              >
                <ArrowLeft size={11} /> 광역 다시 선택
              </button>
              <span className="text-[11px] text-white/50">/ {activeGroup.name} 세부</span>
            </div>
            <ChipGrid>
              <Chip selected={!area} onClick={() => update({ area: "" })}>전체</Chip>
              {activeGroup.areas.map((a) => (
                <Chip
                  key={a.name}
                  selected={area === a.name}
                  onClick={() => update({ region: activeGroup.code, area: a.name })}
                >
                  {a.name}
                  <Count>{a.count}</Count>
                </Chip>
              ))}
            </ChipGrid>
          </>
        ) : (
          <ChipGrid>
            <Chip selected={!region && !area} onClick={() => { update({ region: "", area: "" }); setShowSubAreas(false); }}>
              전체
            </Chip>
            {regionGroups.map((g) => (
              <Chip
                key={g.code}
                selected={region === g.code && !area}
                onClick={() => { update({ region: g.code, area: "" }); setShowSubAreas(true); }}
              >
                {g.name}
                <Count>{g.count}</Count>
              </Chip>
            ))}
          </ChipGrid>
        )
      ) : (
        <ChipGrid>
          <Chip selected={!bizType} onClick={() => update({ bizType: "" })}>전체</Chip>
          {bizTypes.map((b) => (
            <Chip key={b.name} selected={bizType === b.name} onClick={() => update({ bizType: b.name })}>
              {b.name}
              <Count>{b.count}</Count>
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
