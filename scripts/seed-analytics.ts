/**
 * AnalyticsEvent + SearchLog 시드 데이터 생성
 * 실행: npm run db:seed
 *
 * AnalyticsEvent : 45,000건 (배치 1,000 × 45)
 * SearchLog      :  5,000건 (배치 1,000 × 5)
 * 총              : 50,000건
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { EventType } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── 상수 ─────────────────────────────────────────────────────────────────────

const ANALYTICS_TOTAL = 45_000;
const SEARCH_TOTAL    =  5_000;
const BATCH           =  1_000;

const EVENT_WEIGHTS = [
  { type: "VIEW",        weight: 0.70 },
  { type: "CALL",        weight: 0.85 },
  { type: "MAP",         weight: 0.95 },
  { type: "RESERVATION", weight: 1.00 },
] as const;

// 검색에 결과가 있는 키워드
const KEYWORDS_HIT = [
  "스파", "마사지", "강남", "홍대", "이태원", "건마", "아로마", "1인샵", "태국식",
  "딥티슈", "스웨디시", "핫스톤", "커플", "남성전용", "24시", "예약",
  "할인", "신규", "강북", "서초", "송파", "마포", "용산", "야간", "주말",
  "당일예약", "인천", "부산", "대구", "수원", "성남",
];

// 결과 0건 키워드 (수요-공급 대시보드 테스트용)
const KEYWORDS_ZERO = [
  "노래방마사지", "사우나마사지", "수영장딸린스파", "전신케어최저가", "남녀공용찜질",
  "로미로미", "힐링센터", "발리식", "인도식마사지", "왁싱전문", "두피마사지",
  "아유르베다", "팔자주름관리", "피부관리전문", "퇴근후힐링",
];

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function pickEventType(): EventType {
  const r = Math.random();
  for (const { type, weight } of EVENT_WEIGHTS) {
    if (r < weight) return type as EventType;
  }
  return EventType.VIEW;
}

function randomDaysAgo(maxDays: number): Date {
  return new Date(Date.now() - Math.random() * maxDays * 86_400_000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 일반 IP 200개 + 과도한 이벤트를 발생시킬 "의심 IP" 5개 */
function buildIpPool(): string[] {
  const pool: string[] = [];

  for (let i = 0; i < 200; i++) {
    pool.push(`10.${Math.floor(i / 256)}.${i % 256}.${Math.floor(Math.random() * 253) + 1}`);
  }

  const suspiciousIps = [
    "203.0.113.1", "203.0.113.2", "198.51.100.1", "198.51.100.5", "192.0.2.99",
  ];

  // 의심 IP 1개당 전체의 ~2% (약 900건씩) 배분 → 10분 창에서 임계값 초과 시뮬레이션
  for (const ip of suspiciousIps) {
    for (let j = 0; j < Math.floor(ANALYTICS_TOTAL * 0.018); j++) {
      pool.push(ip);
    }
  }

  return pool;
}

// ── 진행바 ─────────────────────────────────────────────────────────────────

function progress(done: number, total: number, label: string) {
  const pct = Math.round((done / total) * 100);
  const bar = "█".repeat(Math.floor(pct / 4)).padEnd(25, "░");
  process.stdout.write(`\r  [${bar}] ${pct}% (${done.toLocaleString()} / ${total.toLocaleString()}) ${label}`);
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("━".repeat(60));
  console.log("📊  Analytics Seed 스크립트");
  console.log("━".repeat(60));

  // 1. 실제 Shop ID 목록
  const shops = await prisma.shop.findMany({ select: { id: true } });
  if (shops.length === 0) {
    console.error("\n❌ Shop 테이블이 비어 있습니다. 먼저 업소 데이터를 로드하세요.");
    process.exit(1);
  }
  const shopIds = shops.map((s) => s.id);
  console.log(`\n✔  Shop ${shopIds.length.toLocaleString()}개 확인`);

  const ipPool = buildIpPool();

  // 2. AnalyticsEvent 삽입
  console.log(`\n▶  AnalyticsEvent ${ANALYTICS_TOTAL.toLocaleString()}건 삽입`);
  const t0 = performance.now();

  for (let done = 0; done < ANALYTICS_TOTAL; done += BATCH) {
    const size = Math.min(BATCH, ANALYTICS_TOTAL - done);
    const data = Array.from({ length: size }, () => ({
      storeId:   pick(shopIds),
      eventType: pickEventType(),
      ipAddress: pick(ipPool),
      createdAt: randomDaysAgo(90),
    }));
    await prisma.analyticsEvent.createMany({ data });
    progress(done + size, ANALYTICS_TOTAL, "AnalyticsEvent");
  }

  const analyticsMs = Math.round(performance.now() - t0);
  console.log(`\n  ✅ ${analyticsMs.toLocaleString()}ms 소요\n`);

  // 3. SearchLog 삽입
  console.log(`▶  SearchLog ${SEARCH_TOTAL.toLocaleString()}건 삽입`);
  const t1 = performance.now();

  for (let done = 0; done < SEARCH_TOTAL; done += BATCH) {
    const size = Math.min(BATCH, SEARCH_TOTAL - done);
    const data = Array.from({ length: size }, () => {
      const isZero = Math.random() < 0.30;   // 30%는 결과 0건
      return {
        keyword:     isZero ? pick(KEYWORDS_ZERO) : pick(KEYWORDS_HIT),
        resultCount: isZero ? 0 : Math.floor(Math.random() * 300) + 1,
        createdAt:   randomDaysAgo(30),
      };
    });
    await prisma.searchLog.createMany({ data });
    progress(done + size, SEARCH_TOTAL, "SearchLog     ");
  }

  const searchMs = Math.round(performance.now() - t1);
  console.log(`\n  ✅ ${searchMs.toLocaleString()}ms 소요\n`);

  // 4. 최종 집계
  const [evtCount, logCount] = await Promise.all([
    prisma.analyticsEvent.count(),
    prisma.searchLog.count(),
  ]);

  console.log("━".repeat(60));
  console.log("🎉  Seed 완료");
  console.log(`   AnalyticsEvent : ${evtCount.toLocaleString()}건`);
  console.log(`   SearchLog      : ${logCount.toLocaleString()}건`);
  console.log("━".repeat(60));
}

main()
  .catch((e) => { console.error("\n❌ 오류:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
