import { prisma } from "@/lib/prisma";
import { EventType } from "@/generated/prisma/enums";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FunnelRow {
  storeId: number;
  views: number;
  actions: number; // CALL + MAP + RESERVATION
  conversionRate: number; // actions / views * 100
}

export interface PopularShop {
  storeId: number;
  eventCount: number;
}

export interface ZeroResultKeyword {
  keyword: string;
  count: number;
}

export interface SuspiciousIp {
  ipAddress: string;
  eventCount: number;
}

export interface InactiveShop {
  id: number;
  company: string;
  lastLoginAt: Date | null;
}

// ── 1. Sales Funnel ───────────────────────────────────────────────────────────
// VIEW 대비 행동(CALL, MAP, RESERVATION) 전환율 — storeId 단위 집계

export async function getSalesFunnel(
  since?: Date,
  minViews = 1,
  topN = 200, // 대량 데이터 보호: 전환율 상위 N개만 반환
  to?: Date
): Promise<FunnelRow[]> {
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (since) createdAt.gte = since;
  if (to)    createdAt.lt  = to;
  const where = (since || to) ? { createdAt } : undefined;

  // [createdAt, storeId] 인덱스 활용: createdAt 범위 먼저 필터
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["storeId", "eventType"],
    _count: { _all: true },
    where,
    orderBy: { storeId: "asc" },
  });

  // storeId → { views, actions } 집계
  const map = new Map<number, { views: number; actions: number }>();
  for (const row of rows) {
    const entry = map.get(row.storeId) ?? { views: 0, actions: 0 };
    if (row.eventType === EventType.VIEW) {
      entry.views += row._count._all;
    } else {
      entry.actions += row._count._all;
    }
    map.set(row.storeId, entry);
  }

  const result: FunnelRow[] = [];
  for (const [storeId, { views, actions }] of map) {
    if (views < minViews) continue;
    result.push({
      storeId,
      views,
      actions,
      conversionRate: views > 0 ? Math.round((actions / views) * 1000) / 10 : 0,
    });
  }

  // 전환율 내림차순 후 topN 제한
  return result.sort((a, b) => b.conversionRate - a.conversionRate).slice(0, topN);
}

// ── 2. Popular Shops ──────────────────────────────────────────────────────────
// 최근 N일간 이벤트 가장 많이 발생한 Top K 업소

export async function getPopularShops(
  from: Date,
  to: Date,
  take = 10
): Promise<PopularShop[]> {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["storeId"],
    _count: { id: true },
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { _count: { id: "desc" } },
    take,
  });

  return rows.map((r) => ({ storeId: r.storeId, eventCount: r._count?.id ?? 0 }));
}

// ── 3. Demand-Supply ──────────────────────────────────────────────────────────
// SearchLog에서 결과 0건 키워드 빈도순 (수요는 있으나 공급 없는 키워드)

export async function getZeroResultKeywords(
  take = 50
): Promise<ZeroResultKeyword[]> {
  const rows = await prisma.searchLog.groupBy({
    by: ["keyword"],
    _count: { id: true },
    where: { resultCount: 0 },
    orderBy: { _count: { id: "desc" } },
    take,
  });

  return rows.map((r) => ({ keyword: r.keyword, count: r._count?.id ?? 0 }));
}

// ── 4a. Health — Suspicious IP Detection ─────────────────────────────────────
// windowMinutes 내 threshold 초과 이벤트를 발생시킨 IP 탐지

export async function getSuspiciousIps(
  windowMinutes = 10,
  threshold = 30
): Promise<SuspiciousIp[]> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const rows = await prisma.analyticsEvent.groupBy({
    by: ["ipAddress"],
    _count: { id: true },
    where: { createdAt: { gte: since } },
    having: {
      ipAddress: {
        _count: { gt: threshold },
      },
    },
    orderBy: { _count: { id: "desc" } },
  });

  return rows.map((r) => ({
    ipAddress: r.ipAddress,
    eventCount: r._count?.id ?? 0,
  }));
}

// ── 5. Period Comparison — 기간 대비 증감률 ──────────────────────────────────

export interface PeriodSnapshot {
  views: number;
  actions: number;
  total: number;
  conversionRate: number; // %
}

export interface PeriodComparison {
  current:  PeriodSnapshot;
  previous: PeriodSnapshot;
  /** 양수 = 증가, 음수 = 감소, 소수점 1자리 반올림 */
  changes: {
    views:          number;
    actions:        number;
    total:          number;
    conversionRate: number;
  };
}

/** (cur - prev) / prev × 100, 소수점 1자리 */
function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function extractSnapshot(
  rows: { eventType: string; _count: { _all: number } }[]
): PeriodSnapshot {
  const views   = rows.find((r) => r.eventType === EventType.VIEW)?._count._all ?? 0;
  const actions = rows
    .filter((r) => r.eventType !== EventType.VIEW)
    .reduce((s, r) => s + r._count._all, 0);
  return {
    views,
    actions,
    total: views + actions,
    conversionRate: views > 0 ? Math.round((actions / views) * 1000) / 10 : 0,
  };
}

/**
 * 주어진 [from, to) 구간과 동일한 길이의 직전 구간을 비교해 증감률을 반환합니다.
 * 두 기간을 병렬 쿼리 → [createdAt, storeId] 인덱스 활용.
 */
export async function getPeriodStats(
  from: Date,
  to:   Date
): Promise<PeriodComparison> {
  const rangeMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - rangeMs);
  const prevTo   = from;

  const [currentRows, prevRows] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
      where: { createdAt: { gte: from, lt: to } },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
      where: { createdAt: { gte: prevFrom, lt: prevTo } },
    }),
  ]);

  const current  = extractSnapshot(currentRows);
  const previous = extractSnapshot(prevRows);

  return {
    current,
    previous,
    changes: {
      views:          pctChange(current.views,          previous.views),
      actions:        pctChange(current.actions,        previous.actions),
      total:          pctChange(current.total,          previous.total),
      conversionRate: pctChange(current.conversionRate, previous.conversionRate),
    },
  };
}

// ── 6. Time-series buckets (일·주·월 집계) ────────────────────────────────────
// date_trunc + COUNT FILTER로 단일 쿼리 처리. createdAt 인덱스를 범위 스캔.
//
// 기간별 버킷 선택 정책 (호출자가 결정):
//   ≤ 30일  → 'day'     (데이터 포인트 ≤ 30)
//   31~90일 → 'week'    (데이터 포인트 ≤ 13)
//   > 90일  → 'month'   (데이터 포인트 ≤ 12)
//
// granularity를 런타임 파라미터로 받되, date_trunc의 첫 인자는 상수로 고정되어야
// 인덱스 플래너가 최적 실행 계획을 뽑을 수 있어 SQL을 세 개로 분기.

export type BucketGranularity = "day" | "week" | "month";

export interface TimeBucket {
  date:    string; // YYYY-MM-DD (버킷 시작일)
  views:   number;
  actions: number;
}

export async function getDailyEvents(
  from: Date,
  to:   Date,
  granularity: BucketGranularity = "day"
): Promise<TimeBucket[]> {
  type Row = { bucket: Date; view_count: bigint; action_count: bigint };

  // BETWEEN은 양쪽 inclusive(a <= x <= b). `to`는 exclusive 상한(다음날 자정)이므로
  // 1ms 뺀 값을 상한으로 사용해 기존 `>= AND <` 반-개구간 의미론을 보존.
  // → Postgres btree의 [createdAt, storeId] 인덱스를 범위 스캔(ASC ordered index scan).
  const toInclusive = new Date(to.getTime() - 1);

  let rows: Row[];
  if (granularity === "month") {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT
        date_trunc('month', "createdAt") AS bucket,
        COUNT(*) FILTER (WHERE "eventType" = 'VIEW')::bigint  AS view_count,
        COUNT(*) FILTER (WHERE "eventType" <> 'VIEW')::bigint AS action_count
      FROM "AnalyticsEvent"
      WHERE "createdAt" BETWEEN ${from} AND ${toInclusive}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
  } else if (granularity === "week") {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT
        date_trunc('week', "createdAt") AS bucket,
        COUNT(*) FILTER (WHERE "eventType" = 'VIEW')::bigint  AS view_count,
        COUNT(*) FILTER (WHERE "eventType" <> 'VIEW')::bigint AS action_count
      FROM "AnalyticsEvent"
      WHERE "createdAt" BETWEEN ${from} AND ${toInclusive}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
  } else {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT
        date_trunc('day', "createdAt") AS bucket,
        COUNT(*) FILTER (WHERE "eventType" = 'VIEW')::bigint  AS view_count,
        COUNT(*) FILTER (WHERE "eventType" <> 'VIEW')::bigint AS action_count
      FROM "AnalyticsEvent"
      WHERE "createdAt" BETWEEN ${from} AND ${toInclusive}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
  }

  return rows.map((r) => ({
    date:    r.bucket.toISOString().slice(0, 10),
    views:   Number(r.view_count),
    actions: Number(r.action_count),
  }));
}

/** rangeDays에 맞춰 day/week/month 버킷을 선택 */
export function pickGranularity(rangeDays: number): BucketGranularity {
  if (rangeDays > 90) return "month";
  if (rangeDays > 30) return "week";
  return "day";
}

// ── 4b. Retention — 30일 미접속 업주 필터링 ──────────────────────────────────

export async function getInactiveShops(
  inactiveDays = 30
): Promise<InactiveShop[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

  const shops = await prisma.shop.findMany({
    where: {
      OR: [
        { lastLoginAt: { lt: cutoff } },
        { lastLoginAt: null },
      ],
    },
    select: { id: true, company: true, lastLoginAt: true },
    orderBy: { lastLoginAt: "asc" },
  });

  return shops;
}
