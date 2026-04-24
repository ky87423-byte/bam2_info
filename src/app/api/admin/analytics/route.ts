import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getSalesFunnel,
  getPopularShops,
  getZeroResultKeywords,
  getSuspiciousIps,
  getInactiveShops,
  getPeriodStats,
  getDailyEvents,
  pickGranularity,
} from "@/lib/api/stats";
import { getShops } from "@/lib/data";
import type { AnalyticsData } from "@/types/analytics";

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 365;
const MIN_RANGE_DAYS = 1;

/** YYYY-MM-DD 또는 ISO 문자열을 UTC 00:00Z Date로 파싱 */
function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  // YYYY-MM-DD 형식 보정
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** 자정(UTC) 기준으로 00:00Z로 normalize */
function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolveRange(searchParams: URLSearchParams): { from: Date; to: Date } {
  const now     = new Date();
  const todayUTC = startOfDayUTC(now);
  // 'to'는 exclusive upper bound → 내일 자정
  const defaultTo   = new Date(todayUTC.getTime() + 86_400_000);
  const defaultFrom = new Date(defaultTo.getTime() - 30 * 86_400_000);

  let from = parseDate(searchParams.get("from")) ?? defaultFrom;
  let to   = parseDate(searchParams.get("to"))   ?? defaultTo;

  // from을 자정으로 정렬, to는 다음날 자정으로 확장 (inclusive-day semantics)
  from = startOfDayUTC(from);
  to   = startOfDayUTC(to);
  if (to.getTime() === from.getTime()) to = new Date(from.getTime() + 86_400_000); // 최소 1일
  if (to.getTime() < from.getTime()) [from, to] = [to, from];

  // 최대 365일 클램프 (from이 너무 과거면 자름)
  const maxFrom = new Date(to.getTime() - MAX_RANGE_DAYS * 86_400_000);
  if (from.getTime() < maxFrom.getTime()) from = maxFrom;

  // 최소 1일 보장
  const rangeDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (rangeDays < MIN_RANGE_DAYS) to = new Date(from.getTime() + MIN_RANGE_DAYS * 86_400_000);

  return { from, to };
}

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { from, to } = resolveRange(searchParams);
  const rangeDays   = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const granularity = pickGranularity(rangeDays);

  const [funnel, popularShops, zeroKeywords, suspiciousIps, inactiveShops, period, timeSeriesData] =
    await Promise.all([
      getSalesFunnel(from, 1, 200, to).catch((e) => { console.error("[analytics] getSalesFunnel:", e); return []; }),
      getPopularShops(from, to, 10).catch((e) => { console.error("[analytics] getPopularShops:", e); return []; }),
      getZeroResultKeywords(50).catch((e) => { console.error("[analytics] getZeroResultKeywords:", e); return []; }),
      getSuspiciousIps(10, 30).catch((e) => { console.error("[analytics] getSuspiciousIps:", e); return []; }),
      getInactiveShops(30).catch((e) => { console.error("[analytics] getInactiveShops:", e); return []; }),
      getPeriodStats(from, to).catch((e) => { console.error("[analytics] getPeriodStats:", e); return null; }),
      getDailyEvents(from, to, granularity).catch((e) => { console.error("[analytics] getDailyEvents:", e); return []; }),
    ]);

  // ── Shop JSON 데이터 (지역 / 업종 집계) ───────────────────────────────────
  const { shops: allShops, total: totalShops } = getShops("", "", 1, 99999);

  // 지역별 밀집도 TOP 10
  const areaCounts: Record<string, number> = {};
  for (const s of allShops) {
    const a = s.area.replace(/,+$/, "").trim();
    if (a) areaCounts[a] = (areaCounts[a] ?? 0) + 1;
  }
  const areaData = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // 카테고리별 활성도 TOP 5
  const shopCatMap = new Map<number, string>();
  for (const s of allShops) {
    const cat = (s.category ?? "").trim();
    if (cat) shopCatMap.set(s.id, cat);
  }
  const catAgg = new Map<string, { views: number; actions: number }>();
  for (const row of funnel) {
    const cat = shopCatMap.get(row.storeId);
    if (!cat) continue;
    const e = catAgg.get(cat) ?? { views: 0, actions: 0 };
    e.views   += row.views;
    e.actions += row.actions;
    catAgg.set(cat, e);
  }
  const categoryData = [...catAgg.entries()]
    .map(([name, { views, actions }]) => ({
      name:   name.length > 10 ? `${name.slice(0, 9)}…` : name,
      조회수: views,
      클릭수: actions,
    }))
    .sort((a, b) => (b.조회수 + b.클릭수) - (a.조회수 + a.클릭수))
    .slice(0, 5);

  const funnelChartData = funnel.slice(0, 10).map((row) => ({
    name:   `#${row.storeId}`,
    조회수: row.views,
    행동수: row.actions,
  }));

  const totalViews   = funnel.reduce((s, r) => s + r.views,   0);
  const totalActions = funnel.reduce((s, r) => s + r.actions, 0);
  const avgConv = funnel.length
    ? Math.round((funnel.reduce((s, r) => s + r.conversionRate, 0) / funnel.length) * 10) / 10
    : 0;

  const body: AnalyticsData = {
    generatedAt: new Date().toISOString(),
    from: toDateString(from),
    to:   toDateString(to),
    rangeDays,
    granularity,
    funnel,
    popularShops,
    zeroKeywords,
    suspiciousIps,
    inactiveShops: inactiveShops.map((s) => ({
      ...s,
      lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
    })),
    period,
    areaData,
    categoryData,
    funnelChartData,
    timeSeriesData,
    totalViews,
    totalActions,
    avgConv,
    totalShops,
  };

  return NextResponse.json(body);
}
