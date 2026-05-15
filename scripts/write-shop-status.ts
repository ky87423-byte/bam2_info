import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const SHOP_STATUS_PATH = path.join(process.cwd(), "data", "shop_status.json");
const DATA_DIR         = path.join(process.cwd(), "data");

(async () => {
  const rows = await prisma.shop.findMany({
    where:  { isScraped: true, externalId: { not: null } },
    select: { externalId: true, sourceStatus: true },
  });
  const map: Record<string, string> = {};
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (r.externalId != null) {
      map[String(r.externalId)] = r.sourceStatus;
      counts[r.sourceStatus] = (counts[r.sourceStatus] ?? 0) + 1;
    }
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SHOP_STATUS_PATH, JSON.stringify(map));
  console.log(`📝 shop_status.json 갱신 (${rows.length}건)`);
  console.log("상태별 분포:", counts);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
