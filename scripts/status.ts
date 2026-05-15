import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

(async () => {
  const [active, missing, deleted, archived, lastSeen] = await Promise.all([
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "ACTIVE" } }),
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "MISSING" } }),
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "DELETED_CONFIRMED" } }),
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "ARCHIVED" } }),
    prisma.shop.findFirst({ where: { lastSeenInListAt: { not: null } }, orderBy: { lastSeenInListAt: "desc" }, select: { lastSeenInListAt: true } }),
  ]);
  console.log("=== 현재 SourceStatus 분포 ===");
  console.log(`ACTIVE:             ${active}`);
  console.log(`MISSING:            ${missing}`);
  console.log(`DELETED_CONFIRMED:  ${deleted}`);
  console.log(`ARCHIVED:           ${archived}`);
  console.log(`마지막 목록 관측:    ${lastSeen?.lastSeenInListAt?.toISOString() ?? "없음"}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
