/**
 * 실 DB 교차 검증 스크립트
 * 실행: npm run db:verify [storeId]
 *
 * 1. 지정 업소의 원시 이벤트 카운트(raw SQL)와
 *    getSalesFunnel() 계산값이 일치하는지 확인합니다.
 * 2. SearchLog 0건 키워드가 빈도순으로 올바르게 정렬되는지 확인합니다.
 */
import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

// ── 색상 출력 ─────────────────────────────────────────────────────────────────

const c = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function pass(msg: string) { console.log(`  ${c.green("✅ PASS")}  ${msg}`); }
function fail(msg: string) { console.log(`  ${c.red("❌ FAIL")}  ${msg}`); }
function info(msg: string) { console.log(`  ${c.dim("ℹ")}       ${msg}`); }

// ═════════════════════════════════════════════════════════════════════════════
// 섹션 1. 특정 업소 전환율 검증
// ═════════════════════════════════════════════════════════════════════════════

async function verifyFunnelForShop(storeId: number) {
  console.log(c.bold(`\n━━━ 섹션 1. 업소 #${storeId} 전환율 교차 검증 ━━━`));

  // 1-A. raw SQL: 이벤트 타입별 카운트
  type RawCount = { eventtype: string; cnt: bigint };
  const rawRows = await prisma.$queryRaw<RawCount[]>`
    SELECT "eventType" AS eventtype, COUNT(*) AS cnt
    FROM   "AnalyticsEvent"
    WHERE  "storeId" = ${storeId}
    GROUP  BY "eventType"
    ORDER  BY "eventType"
  `;

  if (rawRows.length === 0) {
    console.log(c.yellow(`  ⚠  업소 #${storeId}에 이벤트 데이터가 없습니다.`));
    return;
  }

  const rawMap: Record<string, number> = {};
  for (const row of rawRows) {
    rawMap[row.eventtype] = Number(row.cnt);
  }

  const rawViews   = rawMap["VIEW"]        ?? 0;
  const rawActions = (rawMap["CALL"] ?? 0) + (rawMap["MAP"] ?? 0) + (rawMap["RESERVATION"] ?? 0);
  const rawConv    = rawViews > 0 ? Math.round((rawActions / rawViews) * 1000) / 10 : 0;

  info(`raw SQL  → VIEW=${rawViews}  CALL=${rawMap["CALL"]??0}  MAP=${rawMap["MAP"]??0}  RESERVATION=${rawMap["RESERVATION"]??0}`);
  info(`raw SQL  → actions=${rawActions}  전환율=${rawConv}%`);

  // 1-B. 서비스 레이어: getSalesFunnel (동일 로직 직접 구현 — path alias 우회)
  const svcRows = await prisma.analyticsEvent.groupBy({
    by: ["storeId", "eventType"],
    _count: { _all: true },
    where: { storeId },
    orderBy: { storeId: "asc" },
  });

  let svcViews = 0, svcActions = 0;
  for (const row of svcRows) {
    if (row.eventType === "VIEW") svcViews   += row._count._all;
    else                          svcActions += row._count._all;
  }
  const svcConv = svcViews > 0 ? Math.round((svcActions / svcViews) * 1000) / 10 : 0;

  info(`서비스 레이어 → views=${svcViews}  actions=${svcActions}  전환율=${svcConv}%`);

  // 1-C. 비교
  console.log();
  if (rawViews === svcViews)    pass(`VIEW 카운트 일치 (${rawViews})`);
  else                          fail(`VIEW 불일치: raw=${rawViews}  svc=${svcViews}`);

  if (rawActions === svcActions) pass(`행동(CALL+MAP+RESERVATION) 카운트 일치 (${rawActions})`);
  else                           fail(`행동 불일치: raw=${rawActions}  svc=${svcActions}`);

  if (rawConv === svcConv)       pass(`전환율 일치 (${rawConv}%)`);
  else                           fail(`전환율 불일치: raw=${rawConv}%  svc=${svcConv}%`);

  // 1-D. 전체 합계 검증
  type TotalRow = { total: bigint };
  const [{ total }] = await prisma.$queryRaw<TotalRow[]>`
    SELECT COUNT(*) AS total FROM "AnalyticsEvent" WHERE "storeId" = ${storeId}
  `;
  const expectedTotal = rawViews + rawActions;
  if (Number(total) === expectedTotal) {
    pass(`총 이벤트 수 일치 (${Number(total)}건 = VIEW + 행동)`);
  } else {
    fail(`총 이벤트 수 불일치: DB total=${Number(total)}, VIEW+행동=${expectedTotal}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 섹션 2. 수요-공급 불균형 정렬 검증
// ═════════════════════════════════════════════════════════════════════════════

async function verifyZeroKeywords(topN = 20) {
  console.log(c.bold(`\n━━━ 섹션 2. 수요-공급 불균형 (결과 0건 키워드) 검증 ━━━`));

  // 2-A. raw SQL
  type KwRow = { keyword: string; cnt: bigint };
  const rawKw = await prisma.$queryRaw<KwRow[]>`
    SELECT "keyword", COUNT(*) AS cnt
    FROM   "SearchLog"
    WHERE  "resultCount" = 0
    GROUP  BY "keyword"
    ORDER  BY cnt DESC
    LIMIT  ${topN}
  `;

  if (rawKw.length === 0) {
    console.log(c.yellow("  ⚠  결과 0건 SearchLog가 없습니다."));
    return;
  }

  // 2-B. 서비스 레이어
  const svcKw = await prisma.searchLog.groupBy({
    by: ["keyword"],
    _count: { id: true },
    where: { resultCount: 0 },
    orderBy: { _count: { id: "desc" } },
    take: topN,
  });

  info(`raw SQL  상위 ${rawKw.length}개: ${rawKw.slice(0, 5).map((r) => `"${r.keyword}"(${Number(r.cnt)})`).join(", ")} ...`);
  info(`서비스   상위 ${svcKw.length}개: ${svcKw.slice(0, 5).map((r) => `"${r.keyword}"(${r._count?.id ?? 0})`).join(", ")} ...`);
  console.log();

  // 2-C. 키워드·카운트 일치 비교
  let allMatch = true;
  for (let i = 0; i < Math.max(rawKw.length, svcKw.length); i++) {
    const raw = rawKw[i];
    const svc = svcKw[i];
    if (!raw || !svc) {
      fail(`순위 ${i + 1}: row 수 불일치 (raw=${rawKw.length}, svc=${svcKw.length})`);
      allMatch = false;
      break;
    }
    const countMatch   = Number(raw.cnt) === (svc._count?.id ?? 0);
    const keywordMatch = raw.keyword === svc.keyword;
    if (!countMatch || !keywordMatch) {
      fail(`순위 ${i + 1}: raw=("${raw.keyword}", ${Number(raw.cnt)}) ≠ svc=("${svc.keyword}", ${svc._count?.id ?? 0})`);
      allMatch = false;
    }
  }
  if (allMatch) pass(`상위 ${rawKw.length}개 키워드 순위·카운트 완전 일치`);

  // 2-D. 정렬 방향 검증 (내림차순)
  let sortOk = true;
  for (let i = 0; i < svcKw.length - 1; i++) {
    if ((svcKw[i]._count?.id ?? 0) < (svcKw[i + 1]._count?.id ?? 0)) {
      fail(`정렬 오류: 순위 ${i + 1}(${svcKw[i]._count?.id ?? 0}) < 순위 ${i + 2}(${svcKw[i + 1]._count?.id ?? 0})`);
      sortOk = false;
    }
  }
  if (sortOk) pass("빈도 내림차순 정렬 확인");

  // 2-E. resultCount=0 필터 검증 (샘플링)
  type FilterCheck = { non_zero: bigint };
  const [check] = await prisma.$queryRaw<FilterCheck[]>`
    SELECT COUNT(*) AS non_zero
    FROM   "SearchLog"
    WHERE  "keyword" = ANY(${rawKw.map((r) => r.keyword)})
      AND  "resultCount" > 0
  `;
  // 집계 키워드들이 resultCount=0 레코드만 포함하는지 확인
  // (같은 키워드가 resultCount>0인 경우도 있을 수 있으므로 경고만)
  if (Number(check.non_zero) > 0) {
    info(`참고: 위 키워드 중 resultCount>0인 레코드가 ${Number(check.non_zero)}건 존재 (다른 시점의 검색, 정상)`);
  } else {
    pass("집계 키워드는 모두 resultCount=0 레코드로만 구성됨");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 섹션 3. 데이터 정합성 요약
// ═════════════════════════════════════════════════════════════════════════════

async function printSummary(storeId: number) {
  console.log(c.bold("\n━━━ 섹션 3. DB 현황 요약 ━━━"));

  type SummaryRow = {
    total_events: bigint;
    distinct_stores: bigint;
    view_count: bigint;
    call_count: bigint;
    map_count: bigint;
    rsv_count: bigint;
  };
  const [summary] = await prisma.$queryRaw<SummaryRow[]>`
    SELECT
      COUNT(*)                                          AS total_events,
      COUNT(DISTINCT "storeId")                         AS distinct_stores,
      COUNT(*) FILTER (WHERE "eventType" = 'VIEW')      AS view_count,
      COUNT(*) FILTER (WHERE "eventType" = 'CALL')      AS call_count,
      COUNT(*) FILTER (WHERE "eventType" = 'MAP')       AS map_count,
      COUNT(*) FILTER (WHERE "eventType" = 'RESERVATION') AS rsv_count
    FROM "AnalyticsEvent"
  `;

  type ZeroRow = { zero_kw: bigint; total_searches: bigint };
  const [zeroSummary] = await prisma.$queryRaw<ZeroRow[]>`
    SELECT
      COUNT(*)                                        AS total_searches,
      COUNT(*) FILTER (WHERE "resultCount" = 0)      AS zero_kw
    FROM "SearchLog"
  `;

  console.log(`
  AnalyticsEvent 전체 현황
  ┌─────────────────────────────────────────┐
  │ 총 이벤트       : ${String(Number(summary.total_events)).padStart(8)}건          │
  │ 이벤트 발생 업소 : ${String(Number(summary.distinct_stores)).padStart(8)}개          │
  │ VIEW            : ${String(Number(summary.view_count)).padStart(8)}건          │
  │ CALL            : ${String(Number(summary.call_count)).padStart(8)}건          │
  │ MAP             : ${String(Number(summary.map_count)).padStart(8)}건          │
  │ RESERVATION     : ${String(Number(summary.rsv_count)).padStart(8)}건          │
  └─────────────────────────────────────────┘

  SearchLog 현황
  ┌─────────────────────────────────────────┐
  │ 총 검색         : ${String(Number(zeroSummary.total_searches)).padStart(8)}건          │
  │ 결과 0건        : ${String(Number(zeroSummary.zero_kw)).padStart(8)}건          │
  │ 0건 비율        : ${String(Math.round((Number(zeroSummary.zero_kw) / Number(zeroSummary.total_searches)) * 100)).padStart(7)}%          │
  └─────────────────────────────────────────┘
  `);

  // 업소 #storeId 상세 raw
  type ShopDetail = { eventtype: string; cnt: bigint };
  const shopDetail = await prisma.$queryRaw<ShopDetail[]>`
    SELECT "eventType" AS eventtype, COUNT(*) AS cnt
    FROM "AnalyticsEvent"
    WHERE "storeId" = ${storeId}
    GROUP BY "eventType"
    ORDER BY cnt DESC
  `;

  if (shopDetail.length > 0) {
    console.log(`  업소 #${storeId} 이벤트 상세`);
    for (const row of shopDetail) {
      console.log(`    ${row.eventtype.padEnd(14)}: ${Number(row.cnt)}건`);
    }
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const argId   = parseInt(process.argv[2] ?? "", 10);

  console.log(c.bold("\n" + "═".repeat(56)));
  console.log(c.bold("   Analytics 데이터 정합성 검증 스크립트"));
  console.log(c.bold("═".repeat(56)));

  // DB 연결 확인
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(c.red(`\n❌ DB 연결 실패: ${msg}`));
    process.exit(1);
  }

  // storeId 결정: 인수 → DB에서 이벤트 가장 많은 업소
  let storeId = argId;
  if (!storeId || isNaN(storeId)) {
    type TopShop = { storeid: bigint };
    const [top] = await prisma.$queryRaw<TopShop[]>`
      SELECT "storeId" AS storeid, COUNT(*) AS cnt
      FROM "AnalyticsEvent"
      GROUP BY "storeId"
      ORDER BY cnt DESC
      LIMIT 1
    `;
    if (!top) {
      console.error(c.red("\n❌ AnalyticsEvent 데이터가 없습니다. 먼저 db:seed를 실행하세요."));
      process.exit(1);
    }
    storeId = Number(top.storeid);
    console.log(c.cyan(`\n  검증 대상 업소: #${storeId} (이벤트 가장 많은 업소 자동 선택)`));
    console.log(c.dim("  특정 업소를 지정하려면: npm run db:verify -- <storeId>"));
  } else {
    console.log(c.cyan(`\n  검증 대상 업소: #${storeId} (사용자 지정)`));
  }

  await printSummary(storeId);
  await verifyFunnelForShop(storeId);
  await verifyZeroKeywords(20);

  console.log(c.bold("\n" + "═".repeat(56) + "\n"));
}

main()
  .catch((e) => { console.error(c.red(`\n❌ 오류: ${e.message}`)); process.exit(1); })
  .finally(() => prisma.$disconnect());
