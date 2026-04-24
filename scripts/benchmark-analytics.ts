/**
 * 대시보드 쿼리 성능 벤치마크
 * 실행: npm run db:benchmark
 *
 * 각 쿼리를 5회 실행 후 평균/P95를 출력하고
 * 500ms 임계값 초과 시 SLOW 표시 + 튜닝 힌트를 제안합니다.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const THRESHOLD_MS = 500;
const RUNS = 5;

// ── 측정 유틸 ─────────────────────────────────────────────────────────────────

async function runN<T>(fn: () => Promise<T>): Promise<{ avg: number; p95: number; last: T }> {
  const times: number[] = [];
  let last!: T;
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now();
    last = await fn();
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  const avg = Math.round(times.reduce((s, v) => s + v, 0) / times.length);
  const p95 = Math.round(times[Math.floor(times.length * 0.95)] ?? times[times.length - 1]);
  return { avg, p95, last };
}

function printRow(
  name: string,
  avg: number,
  p95: number,
  rowCount: number,
  hint?: string,
) {
  const pass  = avg <= THRESHOLD_MS;
  const badge = pass ? "✅ PASS" : "❌ SLOW";
  const avgStr = String(avg).padStart(5);
  const p95Str = String(p95).padStart(5);
  const cntStr = String(rowCount).padStart(6);
  console.log(`  ${badge}  ${name.padEnd(30)} avg=${avgStr}ms  p95=${p95Str}ms  rows=${cntStr}`);
  if (!pass && hint) {
    console.log(`         💡 ${hint}`);
  }
}

// ── 쿼리 구현 (stats.ts와 동일 로직, 직접 참조) ─────────────────────────────

async function q_salesFunnel() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  return prisma.analyticsEvent.groupBy({
    by: ["storeId", "eventType"],
    _count: { _all: true },
    where: { createdAt: { gte: since } },
    orderBy: { storeId: "asc" },
  });
}

async function q_popularShops() {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  return prisma.analyticsEvent.groupBy({
    by: ["storeId"],
    _count: { id: true },
    where: { createdAt: { gte: since } },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });
}

async function q_zeroKeywords() {
  return prisma.searchLog.groupBy({
    by: ["keyword"],
    _count: { id: true },
    where: { resultCount: 0 },
    orderBy: { _count: { id: "desc" } },
    take: 50,
  });
}

async function q_suspiciousIps() {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  return prisma.analyticsEvent.groupBy({
    by: ["ipAddress"],
    _count: { _all: true },
    where: { createdAt: { gte: since } },
    having: { ipAddress: { _count: { gt: 30 } } },
    orderBy: { _count: { id: "desc" } },
  });
}

async function q_inactiveShops() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return prisma.shop.findMany({
    where: { OR: [{ lastLoginAt: { lt: cutoff } }, { lastLoginAt: null }] },
    select: { id: true, company: true, lastLoginAt: true },
    orderBy: { lastLoginAt: "asc" },
  });
}

// ── 병렬 전체 실행 (API 응답 시간 시뮬레이션) ────────────────────────────────

async function q_parallel() {
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);
  await Promise.all([q_salesFunnel(), q_popularShops(), q_zeroKeywords(), q_suspiciousIps(), q_inactiveShops()]);
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "━".repeat(70));
  console.log("🚀  Analytics 대시보드 벤치마크");
  console.log(`    각 쿼리 ${RUNS}회 실행 · 임계값 ${THRESHOLD_MS}ms`);
  console.log("━".repeat(70));

  // DB 연결 확인
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ DB 연결 실패: ${msg}`);
    console.error("   DATABASE_URL을 .env에 설정한 후 재실행하세요.");
    process.exit(1);
  }

  // 총 레코드 수 출력
  const [evtCnt, logCnt, shopCnt] = await Promise.all([
    prisma.analyticsEvent.count(),
    prisma.searchLog.count(),
    prisma.shop.count(),
  ]);
  console.log(`\n  테이블 현황: Shop=${shopCnt.toLocaleString()}  AnalyticsEvent=${evtCnt.toLocaleString()}  SearchLog=${logCnt.toLocaleString()}\n`);

  // ── 개별 쿼리 측정 ──
  console.log("  [개별 쿼리]");

  const funnel    = await runN(q_salesFunnel);
  printRow("getSalesFunnel (30d)",    funnel.avg,    funnel.p95,    funnel.last.length,
    "@@index([createdAt, storeId, eventType]) 추가를 고려하세요");

  const popular   = await runN(q_popularShops);
  printRow("getPopularShops (7d)",    popular.avg,   popular.p95,   popular.last.length,
    "@@index([createdAt, storeId]) 추가 — createdAt이 선두 컬럼이어야 합니다");

  const zero      = await runN(q_zeroKeywords);
  printRow("getZeroKeywords",         zero.avg,      zero.p95,      zero.last.length,
    "SearchLog에 @@index([resultCount]) 추가하세요");

  const suspicious = await runN(q_suspiciousIps);
  printRow("getSuspiciousIps (10m)",  suspicious.avg, suspicious.p95, suspicious.last.length,
    "@@index([ipAddress, createdAt]) 추가하세요");

  const inactive  = await runN(q_inactiveShops);
  printRow("getInactiveShops (30d)",  inactive.avg,  inactive.p95,  inactive.last.length,
    "Shop에 @@index([lastLoginAt]) 추가하세요");

  // ── 병렬 실행 (실제 API 응답 시뮬레이션) ──
  console.log("\n  [병렬 실행 — Promise.all, API 응답 시뮬레이션]");
  const parallel  = await runN(q_parallel);
  const parallelPass = parallel.avg <= THRESHOLD_MS;
  console.log(
    `  ${parallelPass ? "✅ PASS" : "❌ SLOW"}  ${"전체 병렬 (5쿼리)".padEnd(30)}` +
    ` avg=${String(parallel.avg).padStart(5)}ms  p95=${String(parallel.p95).padStart(5)}ms`
  );

  // ── 요약 ──
  const allAvgs = [funnel.avg, popular.avg, zero.avg, suspicious.avg, inactive.avg];
  const slowCount = allAvgs.filter((v) => v > THRESHOLD_MS).length;

  console.log("\n" + "━".repeat(70));
  if (slowCount === 0 && parallel.avg <= THRESHOLD_MS) {
    console.log("🎉  모든 쿼리 500ms 이내 — 현재 인덱스로 충분합니다.");
  } else {
    console.log(`⚠️  ${slowCount}개 쿼리가 임계값 초과. 위 💡 힌트의 인덱스를 추가하세요.`);
    console.log("   npx prisma migrate dev --name add_analytics_perf_indexes");
  }
  console.log("━".repeat(70) + "\n");
}

main()
  .catch((e) => { console.error("❌ 오류:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
