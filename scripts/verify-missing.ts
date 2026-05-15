/**
 * MISSING 상태인 Shop들을 실제 소스 사이트에서 검증.
 *
 * 사용법:
 *   npx tsx scripts/verify-missing.ts             # 전체 MISSING 검증
 *   npx tsx scripts/verify-missing.ts --limit 20  # 20건만 (테스트용)
 *   npx tsx scripts/verify-missing.ts --dry-run   # DB 갱신 없이 결과만 출력
 *
 * 판정:
 *   - 다이얼로그 "삭제/존재/권한"        → DELETED_CONFIRMED
 *   - 페이지 정상 로드 (제목 등 검출)    → ACTIVE 복구 (false positive)
 *   - 다이얼로그 "로그인이 필요"          → 세션 만료, 재로그인 후 재시도
 *   - 그 외 (타임아웃/에러)                → 그대로 MISSING 유지
 */
import "dotenv/config";
import path from "path";
import puppeteer, { Browser, Dialog, Page } from "puppeteer";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// 스크래퍼의 login 함수 재사용
// @ts-expect-error scraper.js는 JS module
import { login as scraperLogin, CFG } from "../scraper/scraper.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const DELETE_PATTERNS = [/삭제/, /존재하지\s*않/, /권한이\s*없/, /비공개/];
const RELOGIN_PATTERNS = [/로그인이\s*필/];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand  = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

interface Args { limit?: number; dryRun: boolean; }
function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") out.dryRun = true;
    else if (args[i] === "--limit") out.limit = parseInt(args[++i], 10);
  }
  return out;
}

interface VisitResult { outcome: "deleted" | "alive" | "needs_relogin" | "error"; reason: string; }

async function visitAndDetect(page: Page, wrId: number): Promise<VisitResult> {
  let lastDialog: string | null = null;
  const dialogHandler = async (d: Dialog) => {
    lastDialog = d.message();
    await d.accept().catch(() => {});
  };
  page.on("dialog", dialogHandler);

  const url = `${CFG.baseUrl}/bbs/board.php?bo_table=op_partner_posting&wr_id=${wrId}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await sleep(800); // 다이얼로그 도달 여유

    if (lastDialog) {
      const msg = lastDialog as string;
      if (RELOGIN_PATTERNS.some((p) => p.test(msg))) {
        return { outcome: "needs_relogin", reason: `dialog: ${msg.substring(0, 60)}` };
      }
      if (DELETE_PATTERNS.some((p) => p.test(msg))) {
        return { outcome: "deleted", reason: `dialog: ${msg.substring(0, 60)}` };
      }
      return { outcome: "error", reason: `unknown dialog: ${msg.substring(0, 60)}` };
    }

    // 다이얼로그 없으면 페이지 정상 로드 = 살아 있음 (false positive)
    const hasContent = await page.evaluate(() => {
      const text = document.body.innerText || "";
      return text.length > 200 && /\[[^\]]+\]/.test(text);
    });
    if (hasContent) return { outcome: "alive", reason: "content visible" };

    return { outcome: "error", reason: "no dialog & no content" };
  } catch (e: any) {
    return { outcome: "error", reason: `goto fail: ${e.message?.substring(0, 60) ?? e}` };
  } finally {
    page.off("dialog", dialogHandler);
  }
}

async function main() {
  const { limit, dryRun } = parseArgs();
  console.log(`설정: dryRun=${dryRun}, limit=${limit ?? "전체"}\n`);

  const missing = await prisma.shop.findMany({
    where: { isScraped: true, sourceStatus: "MISSING", externalId: { not: null } },
    select: { id: true, externalId: true, company: true },
    orderBy: { lastScrapedAt: "asc" }, // 오래된 것부터
    ...(limit ? { take: limit } : {}),
  });
  console.log(`검증 대상: ${missing.length}건\n`);

  if (missing.length === 0) { await prisma.$disconnect(); return; }

  // 기존에 다운로드된 Chrome 재사용 (scraper에서 쓰던 버전)
  const chromePath = process.env.CHROME_PATH
    ?? "C:\\Users\\User\\.cache\\puppeteer\\chrome\\win64-147.0.7727.57\\chrome-win64\\chrome.exe";
  const browser: Browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== "false",
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(CFG.userAgent);
    await page.setViewport({ width: 1366, height: 768 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
    await scraperLogin(page);

    let deleted = 0, alive = 0, errors = 0, restrictedAfterRelogin = 0;
    let totalReloginCount = 0;
    let reattemptedItemId: number | null = null;  // 이번에 재로그인 후 재시도하는 아이템
    const startedAt = Date.now();

    for (let i = 0; i < missing.length; i++) {
      const s = missing[i];
      const r = await visitAndDetect(page, s.externalId!);
      const tag = r.outcome === "deleted" ? "🗑️  DELETED" : r.outcome === "alive" ? "✅ ALIVE  " : r.outcome === "needs_relogin" ? "🔐 RELOGIN" : "⚠️  ERROR  ";
      console.log(`[${i + 1}/${missing.length}] ${tag} wr_id=${s.externalId} | ${s.company} — ${r.reason}`);

      if (r.outcome === "needs_relogin") {
        // 이 아이템에 대해 이미 재로그인 후 재시도한 적이 있다면 → 권한 문제로 간주 (재로그인해도 동일 다이얼로그)
        if (reattemptedItemId === s.id) {
          console.log(`   → 재로그인 후에도 동일 다이얼로그 = 접근 권한 없음 → DELETED 처리`);
          reattemptedItemId = null;
          restrictedAfterRelogin++;
          if (!dryRun) {
            await prisma.shop.update({ where: { id: s.id }, data: { sourceStatus: "DELETED_CONFIRMED" } });
          }
          deleted++;
          await sleep(rand(2000, 4000));
          continue;
        }

        totalReloginCount++;
        if (totalReloginCount > 5) { console.log("\n재로그인 5회 초과 → 중단"); break; }
        try {
          const cookies = await page.cookies();
          if (cookies.length) await page.deleteCookie(...cookies);
          await scraperLogin(page);
          reattemptedItemId = s.id;
          i--; // 같은 항목 재시도
          continue;
        } catch (e: any) {
          console.log(`재로그인 실패: ${e.message}`); break;
        }
      }

      // 정상 outcome 도달 시 재시도 플래그 리셋
      reattemptedItemId = null;

      if (!dryRun) {
        if (r.outcome === "deleted") {
          await prisma.shop.update({ where: { id: s.id }, data: { sourceStatus: "DELETED_CONFIRMED" } });
          deleted++;
        } else if (r.outcome === "alive") {
          await prisma.shop.update({
            where: { id: s.id },
            data: { sourceStatus: "ACTIVE", missingStreak: 0, lastSeenInListAt: new Date() },
          });
          alive++;
        } else if (r.outcome === "error") {
          errors++;
        }
      } else {
        if (r.outcome === "deleted") deleted++;
        else if (r.outcome === "alive") alive++;
        else if (r.outcome === "error") errors++;
      }

      await sleep(rand(2000, 4000));
    }

    const dur = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log("\n=== 결과 ===");
    console.log(`🗑️  DELETED_CONFIRMED 전환: ${deleted}건 (그 중 재로그인 후 접근불가: ${restrictedAfterRelogin}건)`);
    console.log(`✅ ACTIVE 복구:             ${alive}건`);
    console.log(`⚠️  에러/판정 불가:           ${errors}건`);
    console.log(`소요: ${dur}초`);
    if (dryRun) console.log("\n※ dry-run 모드 — DB 갱신 안 됨");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
