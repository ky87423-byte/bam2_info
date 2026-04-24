/**
 * scraped_data/shops.json → PostgreSQL import
 * 실행: npm run db:import
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SHOPS_JSON = path.join(__dirname, "../../bam_info/scraped_data/shops.json");

interface ScrapedShop {
  company: string;
  subject: string;
  content: string;
  area: string;
  category?: string;
  category2?: string;
  phone: string;
  hphone: string;
  telegram: string;
  hit: number;
  price: number;
  mainPhoto: string;
  photos: string;
  time1: string;
  time2: string;
  timeFull: number;
  scrapedAt: string;
}

async function main() {
  if (!fs.existsSync(SHOPS_JSON)) {
    console.error("shops.json 없음:", SHOPS_JSON);
    process.exit(1);
  }

  const raw: ScrapedShop[] = JSON.parse(fs.readFileSync(SHOPS_JSON, "utf-8"));
  console.log(`총 ${raw.length}개 업소 import 시작...`);

  let ok = 0;
  let skip = 0;

  for (const s of raw) {
    if (!s.company) { skip++; continue; }

    const photos = s.photos
      ? s.photos.split(",").map((p) => p.trim()).filter(Boolean)
      : [];

    await prisma.shop.create({
      data: {
        company:   s.company,
        subject:   s.subject   ?? "",
        content:   s.content   ?? "",
        area:      s.area      ?? "",
        category:  s.category  ?? "",
        category2: s.category2 ?? "",
        phone:     s.phone     ?? "",
        hphone:    s.hphone    ?? "",
        telegram:  s.telegram  ?? "",
        hit:       s.hit       ?? 0,
        price:     s.price     ?? 0,
        mainPhoto: s.mainPhoto ?? "",
        photos,
        time1:     s.time1     ?? "",
        time2:     s.time2     ?? "",
        timeFull:  s.timeFull  === 1,
      },
    });
    ok++;
    if (ok % 10 === 0) process.stdout.write(`\r  ${ok}개 완료...`);
  }

  console.log(`\n완료: ${ok}개 import, ${skip}개 스킵`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
