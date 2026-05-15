/**
 * shops.json + DB 의 이미지 경로(.gif/.jpg/.jpeg/.png) 를 .webp 로 치환.
 *
 * 안전 로직:
 *   - 실제 .webp 파일이 디스크에 존재하는 경우에만 경로 변경
 *   - 변환 실패한 91개 파일은 원본 그대로 유지 (broken image 안 됨)
 *
 * 처리 대상:
 *   1. scraper/scraped_data/shops.json  : mainPhoto, photos, content (HTML)
 *   2. DB Shop 테이블                    : mainPhoto, photos[], content
 *
 * 사용법:
 *   npx tsx scripts/rewrite-paths-to-webp.ts --dry-run   # 미리보기
 *   npx tsx scripts/rewrite-paths-to-webp.ts             # 실제 적용
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const SHOPS_JSON_PATH = path.join(process.cwd(), "scraper", "scraped_data", "shops.json");
const IMG_DIR         = path.join(process.cwd(), "public", "images", "imgs");

const dryRun = process.argv.includes("--dry-run");

// 이미지 경로 패턴: /images/imgs/{name}.{ext}
const PATH_REGEX = /\/images\/imgs\/([^"'\s,<>]+?)\.(gif|jpg|jpeg|png)\b/gi;

// 디스크에 .webp 가 실제로 있는지 확인 (캐시)
const webpExistsCache = new Map<string, boolean>();
function webpExistsOnDisk(stem: string): boolean {
  if (webpExistsCache.has(stem)) return webpExistsCache.get(stem)!;
  const exists = fs.existsSync(path.join(IMG_DIR, stem + ".webp"));
  webpExistsCache.set(stem, exists);
  return exists;
}

// 단일 문자열에서 경로 치환 (안전: .webp 있을 때만)
function rewriteString(s: string): { result: string; changed: number; skipped: number } {
  let changed = 0, skipped = 0;
  const result = s.replace(PATH_REGEX, (full, stem, _ext) => {
    if (webpExistsOnDisk(stem)) {
      changed++;
      return `/images/imgs/${stem}.webp`;
    } else {
      skipped++;
      return full; // 변환 실패한 파일 — 원본 유지
    }
  });
  return { result, changed, skipped };
}

interface ScrapedRow {
  externalId?: number;
  company?: string;
  mainPhoto?: string;
  photos?: string | string[];
  content?: string;
  [k: string]: unknown;
}

async function rewriteShopsJson(): Promise<{ rows: number; pathsChanged: number; pathsSkipped: number }> {
  console.log(`\n[1/2] shops.json 처리`);
  const raw: ScrapedRow[] = JSON.parse(fs.readFileSync(SHOPS_JSON_PATH, "utf8"));
  let pathsChanged = 0, pathsSkipped = 0;

  for (const row of raw) {
    if (typeof row.mainPhoto === "string") {
      const r = rewriteString(row.mainPhoto);
      row.mainPhoto = r.result; pathsChanged += r.changed; pathsSkipped += r.skipped;
    }
    if (typeof row.photos === "string") {
      const r = rewriteString(row.photos);
      row.photos = r.result; pathsChanged += r.changed; pathsSkipped += r.skipped;
    } else if (Array.isArray(row.photos)) {
      row.photos = row.photos.map((p) => {
        const r = rewriteString(p); pathsChanged += r.changed; pathsSkipped += r.skipped;
        return r.result;
      });
    }
    if (typeof row.content === "string") {
      const r = rewriteString(row.content);
      row.content = r.result; pathsChanged += r.changed; pathsSkipped += r.skipped;
    }
  }

  console.log(`   row 수: ${raw.length}`);
  console.log(`   경로 치환: ${pathsChanged}`);
  console.log(`   경로 유지(변환 실패): ${pathsSkipped}`);

  if (!dryRun) {
    const bak = SHOPS_JSON_PATH + ".bak." + Date.now();
    fs.copyFileSync(SHOPS_JSON_PATH, bak);
    console.log(`   백업: ${path.basename(bak)}`);
    fs.writeFileSync(SHOPS_JSON_PATH, JSON.stringify(raw, null, 2));
    console.log(`   ✅ shops.json 저장`);
  }
  return { rows: raw.length, pathsChanged, pathsSkipped };
}

async function rewriteDb(): Promise<{ rows: number; pathsChanged: number; pathsSkipped: number }> {
  console.log(`\n[2/2] DB Shop 테이블 처리`);
  const shops = await prisma.shop.findMany({
    where: { isScraped: true },
    select: { id: true, mainPhoto: true, photos: true, content: true },
  });
  let pathsChanged = 0, pathsSkipped = 0, rowsUpdated = 0;

  for (const s of shops) {
    let touched = false;
    const update: { mainPhoto?: string; photos?: string[]; content?: string } = {};

    if (s.mainPhoto) {
      const r = rewriteString(s.mainPhoto);
      if (r.changed > 0) { update.mainPhoto = r.result; touched = true; }
      pathsChanged += r.changed; pathsSkipped += r.skipped;
    }
    if (s.photos && s.photos.length) {
      const newPhotos = s.photos.map((p) => {
        const r = rewriteString(p); pathsChanged += r.changed; pathsSkipped += r.skipped;
        return r.result;
      });
      if (JSON.stringify(newPhotos) !== JSON.stringify(s.photos)) {
        update.photos = newPhotos; touched = true;
      }
    }
    if (s.content) {
      const r = rewriteString(s.content);
      if (r.changed > 0) { update.content = r.result; touched = true; }
      pathsChanged += r.changed; pathsSkipped += r.skipped;
    }

    if (touched) {
      rowsUpdated++;
      if (!dryRun) await prisma.shop.update({ where: { id: s.id }, data: update });
    }
  }

  console.log(`   대상 row: ${shops.length} / 갱신 row: ${rowsUpdated}`);
  console.log(`   경로 치환: ${pathsChanged}`);
  console.log(`   경로 유지(변환 실패): ${pathsSkipped}`);
  if (!dryRun) console.log(`   ✅ DB 갱신`);
  return { rows: rowsUpdated, pathsChanged, pathsSkipped };
}

(async () => {
  console.log(`설정: dryRun=${dryRun}`);

  const t0 = Date.now();
  const a = await rewriteShopsJson();
  const b = await rewriteDb();
  const dur = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n=== 종합 ===`);
  console.log(`경로 치환 총: ${a.pathsChanged + b.pathsChanged} 건`);
  console.log(`경로 유지(failure 보호) 총: ${a.pathsSkipped + b.pathsSkipped} 건`);
  console.log(`소요: ${dur}초`);
  if (dryRun) console.log(`\n※ dry-run — 실제 변경 없음`);

  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
