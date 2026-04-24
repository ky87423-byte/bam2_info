"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart2, RefreshCw } from "lucide-react";
import AnalyticsSkeleton from "./AnalyticsSkeleton";
import AnalyticsContent from "./AnalyticsContent";
import DateRangeSlider from "./DateRangeSlider";
import type { AnalyticsData } from "@/types/analytics";

const MAX_DAYS    = 365;
const DEBOUNCE_MS = 300;

// ── 날짜 유틸 ─────────────────────────────────────────────────────────────────

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseISODate(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

// ── 슬라이더 anchor ───────────────────────────────────────────────────────────

/** 오늘(자정 UTC) + 1일을 종료 anchor로 사용해 "오늘"까지 inclusive 선택 */
function computeAnchor(): { baseDate: Date; maxDays: number } {
  const tomorrowUTC = addDays(startOfUTCDay(new Date()), 1);   // idx = maxDays
  const base        = addDays(tomorrowUTC, -MAX_DAYS);          // idx = 0
  return { baseDate: base, maxDays: MAX_DAYS };
}

function resolveInitialIdx(
  baseDate: Date,
  maxDays: number,
  fromParam: string | null,
  toParam:   string | null,
): { startIdx: number; endIdx: number } {
  const fromDate = parseISODate(fromParam);
  const toDate   = parseISODate(toParam);
  if (fromDate && toDate && toDate.getTime() > fromDate.getTime()) {
    const startIdx = Math.max(0,        Math.round((fromDate.getTime() - baseDate.getTime()) / 86_400_000));
    const endIdx   = Math.min(maxDays,  Math.round((toDate.getTime()   - baseDate.getTime()) / 86_400_000));
    if (endIdx > startIdx) return { startIdx, endIdx };
  }
  return { startIdx: maxDays - 30, endIdx: maxDays }; // 기본 최근 30일
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const { baseDate, maxDays } = useMemo(computeAnchor, []);
  const initial = useMemo(
    () => resolveInitialIdx(baseDate, maxDays, searchParams.get("from"), searchParams.get("to")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // 슬라이더 raw 값 — UI(핸들 위치·날짜 라벨)에 즉시 반영
  const [startIdx, setStartIdx] = useState(initial.startIdx);
  const [endIdx,   setEndIdx]   = useState(initial.endIdx);

  const [data,     setData]     = useState<AnalyticsData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [pending,  setPending]  = useState(false);   // 디바운스 대기 중
  const [error,    setError]    = useState(false);

  // 다중 fetch 레이스 방지 — 최신 요청만 state에 반영
  const reqIdRef = useRef(0);
  // 단일 디바운스 타이머 — 어느 핸들을 드래그해도 공유
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (from: Date, to: Date, opts?: { silent?: boolean }) => {
    const id = ++reqIdRef.current;
    if (!opts?.silent) setLoading(true);
    setError(false);
    try {
      const url = `/api/admin/analytics?from=${toDateString(from)}&to=${toDateString(to)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AnalyticsData = await res.json();
      if (id === reqIdRef.current) setData(json);
    } catch (e) {
      console.error("[analytics] fetch failed:", e);
      if (id === reqIdRef.current) setError(true);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, []);

  /** 실제 네트워크 요청 + URL 동기화 — 슬라이더 값(idx)에서 직접 계산 */
  const commitRange = useCallback((s: number, e: number) => {
    const from = addDays(baseDate, s);
    const to   = addDays(baseDate, e);
    const fromStr = toDateString(from);
    const toStr   = toDateString(to);
    router.replace(`?from=${fromStr}&to=${toStr}`, { scroll: false });
    fetchData(from, to);
  }, [baseDate, router, fetchData]);

  // 초기 마운트: 디바운스 없이 즉시 fetch
  useEffect(() => {
    commitRange(initial.startIdx, initial.endIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 언마운트 시 대기 중인 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /**
   * 슬라이더 onChange: 로컬 state는 즉시 업데이트(핸들·라벨이 실시간 반응),
   * 실제 fetch는 마지막 움직임 이후 300ms 뒤에 한 번만 실행.
   * 시작·종료 핸들이 같은 타이머를 공유하므로 어떤 드래그 조합에서도 호출은 1회.
   */
  const handleSlider = useCallback((s: number, e: number) => {
    setStartIdx(s);
    setEndIdx(e);
    setPending(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setPending(false);
      commitRange(s, e);
    }, DEBOUNCE_MS);
  }, [commitRange]);

  const handleRefresh = async () => {
    // 대기 중인 디바운스 취소 후 즉시 요청
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setPending(false);
    setSpinning(true);
    const from = addDays(baseDate, startIdx);
    const to   = addDays(baseDate, endIdx);
    await fetchData(from, to, { silent: true });
    setSpinning(false);
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <div className="flex items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <BarChart2 size={20} className="text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-800">분석 대시보드</h2>
        </div>

        {/* 날짜 범위 슬라이더 */}
        <div className="flex-1 min-w-[240px] max-w-xl mx-2">
          <DateRangeSlider
            baseDate={baseDate}
            maxDays={maxDays}
            startIdx={startIdx}
            endIdx={endIdx}
            onChange={handleSlider}
            disabled={loading && !data}
          />
        </div>

        {/* 대기 인디케이터 + 캐시 뱃지 + 새로고침 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {pending && (
            <span
              className="text-[11px] text-indigo-500 font-medium animate-pulse tabular-nums"
              title="입력이 멈추면 데이터를 가져옵니다"
            >
              · · ·
            </span>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-1 font-medium">
            1시간 캐시
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading || spinning}
            title="데이터 새로고침"
            className="p-1.5 rounded-full text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── 본문 ── */}
      {loading && !data ? (
        <AnalyticsSkeleton />
      ) : error && !data ? (
        <div className="flex items-center justify-center h-64 text-sm text-red-500">
          데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      ) : data ? (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <AnalyticsContent data={data} />
        </div>
      ) : null}
    </div>
  );
}
