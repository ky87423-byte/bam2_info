"use client";

import { useState } from "react";
import { MapPin, Tag, X, Filter as FilterIcon, ChevronDown } from "lucide-react";
import { useFilterParams, type FilterProps, type RegionGroupItem } from "./filterUtils";

/**
 * Type C — 사이드바 (accordion + 모바일 drawer)
 *   - 데스크톱(lg↑): 좌측 sticky 사이드바 — 광역 그룹 펼침/접힘 accordion
 *   - 모바일(<lg): 상단 "필터" 토글 버튼 → 클릭 시 드로어 펼쳐짐
 *   페이지 구조 변경: page.tsx 의 SIDEBAR 분기에서 다른 그리드 컨테이너 사용
 */
export default function SidebarFilter({ regionGroups, bizTypes }: FilterProps) {
  const { region, area, bizType, update } = useFilterParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  // accordion: 활성 region 자동 펼침 + 사용자 토글
  const [expandedCode, setExpandedCode] = useState<string>(region);
  const hasFilter = !!region || !!area || !!bizType;

  const activeLabel = area || regionGroups.find((g) => g.code === region)?.name || "";
  const summary = [activeLabel, bizType].filter(Boolean).join(" · ") || "전체";

  const body = (
    <div className="bg-[#1a1a2e] text-white rounded-2xl ring-1 ring-white/10 p-4 lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
        <h3 className="text-xs font-bold text-yellow-400">필터</h3>
        {hasFilter && (
          <button
            type="button"
            onClick={() => { update({ region: "", area: "", bizType: "" }); setExpandedCode(""); }}
            className="inline-flex items-center gap-0.5 text-[10px] text-white/60 hover:text-yellow-400 transition-colors"
          >
            <X size={10} /> 초기화
          </button>
        )}
      </div>

      {/* 지역 — accordion */}
      <Section icon={MapPin} label="지역">
        <Item
          selected={!region && !area}
          onClick={() => { update({ region: "", area: "" }); setExpandedCode(""); }}
          count={null}
        >
          전체
        </Item>
        {regionGroups.map((g) => (
          <RegionGroupNode
            key={g.code}
            group={g}
            expanded={expandedCode === g.code}
            onToggle={() => setExpandedCode((p) => (p === g.code ? "" : g.code))}
            currentRegion={region}
            currentArea={area}
            onSelectRegion={(code) => { update({ region: code, area: "" }); setExpandedCode(code); }}
            onSelectArea={(code, areaName) => { update({ region: code, area: areaName }); setExpandedCode(code); }}
          />
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

  return (
    <>
      {/* 모바일 토글 버튼 — desktop 에선 숨김 / 헤더와 일체화 (위쪽 직선 + shadow) */}
      <button
        type="button"
        onClick={() => setMobileOpen((p) => !p)}
        className="lg:hidden w-full flex items-center justify-between gap-2 px-4 py-3 mb-3 -mx-4 rounded-b-2xl bg-[#1a1a2e] text-white shadow-lg"
      >
        <span className="inline-flex items-center gap-2 text-sm font-bold text-yellow-400">
          <FilterIcon size={14} /> 필터
        </span>
        <span className="text-xs text-white/70 truncate flex-1 text-right">
          {summary}
        </span>
        <ChevronDown size={14} className={["transition-transform", mobileOpen ? "rotate-180" : ""].join(" ")} />
      </button>

      {/* 본체 — 모바일에선 토글로 노출, desktop 에선 항상 노출 */}
      <div className={[mobileOpen ? "block" : "hidden", "lg:block"].join(" ")}>
        {body}
      </div>
    </>
  );
}

function RegionGroupNode({
  group, expanded, onToggle, currentRegion, currentArea, onSelectRegion, onSelectArea,
}: {
  group: RegionGroupItem;
  expanded: boolean;
  onToggle: () => void;
  currentRegion: string;
  currentArea: string;
  onSelectRegion: (code: string) => void;
  onSelectArea: (code: string, areaName: string) => void;
}) {
  const isActive = currentRegion === group.code && !currentArea;

  return (
    <li>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => onSelectRegion(group.code)}
          className={[
            "flex-1 min-h-9 flex items-center justify-between gap-2 px-3 py-2 rounded-l-lg text-xs text-left transition-colors touch-manipulation",
            isActive
              ? "bg-yellow-400 text-black font-bold"
              : "text-white/70 hover:text-white hover:bg-white/10",
          ].join(" ")}
        >
          <span className="truncate">{group.name}</span>
          <span className={["text-[10px] tabular-nums shrink-0", isActive ? "text-black/60" : "text-white/40"].join(" ")}>
            {group.count}
          </span>
        </button>
        <button
          type="button"
          aria-label={`${group.name} 세부 지역 펼치기`}
          onClick={onToggle}
          className={[
            "shrink-0 px-2 rounded-r-lg transition-colors touch-manipulation",
            isActive
              ? "bg-yellow-400 text-black hover:bg-yellow-500"
              : "text-white/40 hover:text-white hover:bg-white/10",
          ].join(" ")}
        >
          <ChevronDown size={12} className={["transition-transform", expanded ? "rotate-180" : ""].join(" ")} />
        </button>
      </div>

      {expanded && (
        <ul className="mt-0.5 mb-1 ml-3 pl-2 border-l border-white/10 space-y-0.5">
          {group.areas.map((a) => {
            const sel = currentArea === a.name;
            return (
              <li key={a.name}>
                <button
                  type="button"
                  onClick={() => onSelectArea(group.code, a.name)}
                  className={[
                    "w-full min-h-8 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-[11px] text-left transition-colors touch-manipulation",
                    sel
                      ? "bg-yellow-400/90 text-black font-bold"
                      : "text-white/60 hover:text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="truncate">{a.name}</span>
                  <span className={["text-[10px] tabular-nums shrink-0", sel ? "text-black/60" : "text-white/30"].join(" ")}>
                    {a.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
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
