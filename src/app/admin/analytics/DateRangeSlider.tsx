"use client";

import { useMemo } from "react";

interface Props {
  /** 슬라이더 최대 인덱스 (baseDate로부터의 일수, 오늘 = maxDays) */
  maxDays: number;
  /** idx=0에 해당하는 기준 날짜 (예: 1년 전 자정) */
  baseDate: Date;
  /** 현재 시작 핸들 위치 (0 ~ maxDays) */
  startIdx: number;
  /** 현재 종료 핸들 위치 (0 ~ maxDays) */
  endIdx: number;
  /** 두 핸들 값 변경 콜백 — 호출자가 debouncing 처리 */
  onChange: (startIdx: number, endIdx: number) => void;
  disabled?: boolean;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

/** YYYY.MM.DD 포맷 */
function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function DateRangeSlider({
  maxDays,
  baseDate,
  startIdx,
  endIdx,
  onChange,
  disabled = false,
}: Props) {
  const { startDate, endDate, rangeDays } = useMemo(() => {
    return {
      startDate: addDays(baseDate, startIdx),
      endDate:   addDays(baseDate, endIdx),
      rangeDays: endIdx - startIdx,
    };
  }, [baseDate, startIdx, endIdx]);

  const startPct = (startIdx / maxDays) * 100;
  const endPct   = (endIdx   / maxDays) * 100;

  // range input 공통 클래스 — pointer-events-none으로 트랙 비활성화,
  // 썸네일만 pointer-events-auto로 인터랙션 허용
  const rangeClass = [
    "absolute inset-0 w-full h-full appearance-none bg-transparent",
    "pointer-events-none outline-none",
    // WebKit (Chrome, Safari, Edge)
    "[&::-webkit-slider-runnable-track]:bg-transparent",
    "[&::-webkit-slider-thumb]:appearance-none",
    "[&::-webkit-slider-thumb]:pointer-events-auto",
    "[&::-webkit-slider-thumb]:h-4",
    "[&::-webkit-slider-thumb]:w-4",
    "[&::-webkit-slider-thumb]:rounded-full",
    "[&::-webkit-slider-thumb]:bg-white",
    "[&::-webkit-slider-thumb]:border-2",
    "[&::-webkit-slider-thumb]:border-indigo-500",
    "[&::-webkit-slider-thumb]:shadow-md",
    "[&::-webkit-slider-thumb]:cursor-grab",
    "[&::-webkit-slider-thumb]:transition-transform",
    "[&::-webkit-slider-thumb]:hover:scale-110",
    "[&::-webkit-slider-thumb]:active:cursor-grabbing",
    "[&::-webkit-slider-thumb]:active:scale-110",
    // Firefox
    "[&::-moz-range-track]:bg-transparent",
    "[&::-moz-range-thumb]:pointer-events-auto",
    "[&::-moz-range-thumb]:h-4",
    "[&::-moz-range-thumb]:w-4",
    "[&::-moz-range-thumb]:rounded-full",
    "[&::-moz-range-thumb]:bg-white",
    "[&::-moz-range-thumb]:border-2",
    "[&::-moz-range-thumb]:border-indigo-500",
    "[&::-moz-range-thumb]:shadow-md",
    "[&::-moz-range-thumb]:cursor-grab",
    disabled && "opacity-50",
  ].filter(Boolean).join(" ");

  return (
    <div className="flex-1 min-w-0">
      {/* 선택된 날짜 표시 — 슬라이더 위에 */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="text-[11px] text-gray-400">시작</div>
        <div className="text-[11px] text-indigo-600 font-semibold tabular-nums bg-indigo-50 rounded-full px-2 py-0.5">
          {rangeDays}일
        </div>
        <div className="text-[11px] text-gray-400">종료</div>
      </div>

      {/* 슬라이더 본체 */}
      <div className="relative h-5 flex items-center">
        {/* 배경 트랙 */}
        <div className="absolute inset-x-0 h-1.5 bg-gray-200 rounded-full top-1/2 -translate-y-1/2" />
        {/* 선택 구간 하이라이트 */}
        <div
          className="absolute h-1.5 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full top-1/2 -translate-y-1/2 transition-[left,right] duration-75"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
        {/* 시작 핸들 — 작은 값 */}
        <input
          type="range"
          min={0}
          max={maxDays}
          value={startIdx}
          disabled={disabled}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), endIdx - 1);
            onChange(v, endIdx);
          }}
          className={rangeClass}
          aria-label="시작 날짜"
        />
        {/* 종료 핸들 — 큰 값 */}
        <input
          type="range"
          min={0}
          max={maxDays}
          value={endIdx}
          disabled={disabled}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), startIdx + 1);
            onChange(startIdx, v);
          }}
          className={rangeClass}
          aria-label="종료 날짜"
        />
      </div>

      {/* 날짜 라벨 — 슬라이더 아래에 */}
      <div className="flex items-center justify-between mt-1.5 tabular-nums">
        <span className="text-xs font-semibold text-gray-700">{formatDate(startDate)}</span>
        <span className="text-xs text-gray-300">—</span>
        <span className="text-xs font-semibold text-gray-700">{formatDate(endDate)}</span>
      </div>
    </div>
  );
}
