"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SHOP_STATUS_PATH = path.join(process.cwd(), "data", "shop_status.json");
const DATA_DIR         = path.join(process.cwd(), "data");

// shop_status.json 갱신 (data.ts loadShops 가 이걸 읽어 공개 페이지 필터링)
async function writeShopStatusJson(): Promise<number> {
  const rows = await prisma.shop.findMany({
    where:  { isScraped: true, externalId: { not: null } },
    select: { externalId: true, sourceStatus: true },
  });
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (r.externalId != null) map[String(r.externalId)] = r.sourceStatus;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SHOP_STATUS_PATH, JSON.stringify(map));
  return rows.length;
}

type SourceStatusValue = "ACTIVE" | "MISSING" | "DELETED_CONFIRMED" | "ARCHIVED";

export type ShopRow = {
  id:               number;
  externalId:       number | null;
  company:          string;
  area:             string;
  sourceStatus:     SourceStatusValue;
  missingStreak:    number;
  lastSeenInListAt: Date | null;
  lastScrapedAt:    Date | null;
};

// 상태별 Shop 리스트 (어드민용)
export async function listShopsBySourceStatus(
  status: SourceStatusValue,
  page = 1,
  pageSize = 50,
): Promise<{ rows: ShopRow[]; total: number }> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { rows: [], total: 0 };

  const where = { isScraped: true, sourceStatus: status };
  const [rows, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      select: {
        id: true, externalId: true, company: true, area: true,
        sourceStatus: true, missingStreak: true,
        lastSeenInListAt: true, lastScrapedAt: true,
      },
      orderBy: { lastSeenInListAt: "desc" },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
    }),
    prisma.shop.count({ where }),
  ]);
  return { rows: rows as ShopRow[], total };
}

// 수동 상태 전환
export async function setShopSourceStatus(
  shopId: number,
  newStatus: SourceStatusValue,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      sourceStatus: newStatus,
      ...(newStatus === "ACTIVE"
        ? { missingStreak: 0, lastSeenInListAt: new Date() }
        : {}),
    },
  });

  await writeShopStatusJson();
  revalidatePath("/admin/shops/source-status");
  revalidatePath("/");
  return { ok: true };
}

// 일괄 전환: MISSING 전체 → DELETED_CONFIRMED (검증 없이 강제)
export async function bulkMarkMissingAsDeleted(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  const r = await prisma.shop.updateMany({
    where: { isScraped: true, sourceStatus: "MISSING" },
    data:  { sourceStatus: "DELETED_CONFIRMED" },
  });
  await writeShopStatusJson();
  revalidatePath("/admin/shops/source-status");
  revalidatePath("/");
  return { ok: true, count: r.count };
}
