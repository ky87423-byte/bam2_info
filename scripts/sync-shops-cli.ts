/**
 * /admin/sync 와 동일한 로직을 CLI 로 실행 (auth 우회).
 * shops.json 의 bizType 필드를 DB Shop.bizType 에 upsert.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOPS_PATH = path.join(__dirname, "..", "scraper", "scraped_data", "shops.json");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
const t0 = Date.now();
const allRows = JSON.parse(fs.readFileSync(SHOPS_PATH, "utf-8"));
console.log(`shops.json: ${allRows.length}건 로드`);

// externalId 기준 dedup — 같은 wr_id 가 retry-images 등으로 중복 append 됐을 수 있음. 마지막 항목 채택.
const seen = new Map<number, any>();
let dupNoExtId = 0;
for (const r of allRows) {
  if (typeof r.externalId !== "number" || isNaN(r.externalId)) {
    dupNoExtId++;
    continue;
  }
  seen.set(r.externalId, r);  // 뒤가 덮어씀 (최신 우선)
}
const raw = [...seen.values()];
console.log(`dedup 후: ${raw.length}건 (externalId 누락 ${dupNoExtId}건은 별도 스킵)`);

let created = 0, updated = 0, skipped = dupNoExtId;

const CHUNK = 100;
for (let i = 0; i < raw.length; i += CHUNK) {
  const batch = raw.slice(i, i + CHUNK);
  await Promise.all(batch.map(async (row) => {
    if (typeof row.externalId !== "number" || isNaN(row.externalId)) {
      skipped++;
      return;
    }
    const data = {
      company:   row.company || `업소 #${row.externalId}`,
      subject:   row.subject ?? "",
      content:   row.content ?? "",
      area:      row.area ?? "",
      bizType:   row.bizType ?? "",
      category:  row.category ?? "",
      category2: row.category2 ?? "",
      phone:     row.phone ?? "",
      hphone:    row.hphone ?? "",
      telegram:  row.telegram ?? "",
      hit:       row.hit ?? 0,
      price:     row.price ?? 0,
      mainPhoto: row.mainPhoto ?? "",
      photos:    Array.isArray(row.photos) ? row.photos
               : typeof row.photos === "string" && row.photos
                 ? row.photos.split(",").map((s: string) => s.trim()).filter(Boolean)
                 : [],
      time1:     row.time1 ?? "",
      time2:     row.time2 ?? "",
      timeFull:  Boolean(row.timeFull),
      isScraped: true,
      lastScrapedAt: row.scrapedAt ? new Date(row.scrapedAt) : new Date(),
    };
    const result = await prisma.shop.upsert({
      where:  { externalId: row.externalId },
      update: data,
      create: { ...data, externalId: row.externalId },
      select: { createdAt: true, updatedAt: true },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
  }));
  if ((i / CHUNK) % 5 === 0) console.log(`  진행: ${Math.min(i + CHUNK, raw.length)}/${raw.length}`);
}

const dur = Date.now() - t0;
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`✅ 신규:   ${created}`);
console.log(`✅ 갱신:   ${updated}`);
console.log(`⏭  스킵:  ${skipped}`);
console.log(`⏱  소요:  ${(dur / 1000).toFixed(1)}s`);

// bizType 분포 검증
const dist = await prisma.shop.groupBy({ by: ["bizType"], _count: { _all: true }, orderBy: { _count: { bizType: "desc" } } });
console.log("\n=== DB Shop.bizType 분포 ===");
for (const r of dist) console.log(`  ${(r.bizType || "(없음)").padEnd(15)} ${r._count._all}`);

await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
