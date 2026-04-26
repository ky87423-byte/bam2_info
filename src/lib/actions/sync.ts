"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureVirtualUserForShop } from "@/lib/virtualUsers";

const SHOPS_PATH = path.join(process.cwd(), "scraper", "scraped_data", "shops.json");

// shops.json 의 row 구조 (스크래퍼 출력)
interface ScrapedRow {
  externalId?: number;
  company:     string;
  subject:     string;
  content:     string;
  area:        string;
  bizType?:    string;     // 실제 업종 (건마/오피/술집...)  — 백필 후 신규 필드
  category:    string;     // [legacy] 광역 지역 코드
  category2:   string;     // [legacy] 세부 지역 코드
  phone:       string;
  hphone:      string;
  telegram:    string;
  hit:         number;
  price:       number;
  mainPhoto:   string;
  photos:      string | string[];
  time1:       string;
  time2:       string;
  timeFull:    number | boolean;
  scrapedAt?:  string;
}

export interface SyncResult {
  ok:       true;
  total:    number;       // shops.json 전체 행 수
  upserted: number;       // 신규 + 갱신
  created:  number;       // 신규
  updated:  number;       // 기존 갱신
  skipped:  number;       // externalId 누락 등으로 스킵
  virtualUsersCreated: number;  // 가상 user 신규 생성 수
  durationMs: number;
}

export type SyncActionResult =
  | SyncResult
  | { ok: false; error: string };

// ── 메인 sync 액션 (admin 전용) ────────────────────────────────────────
export async function syncShopsFromJsonAction(): Promise<SyncActionResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  if (!fs.existsSync(SHOPS_PATH)) {
    return { ok: false, error: `shops.json 파일을 찾을 수 없습니다 (${SHOPS_PATH})` };
  }

  const t0 = Date.now();
  const raw: ScrapedRow[] = JSON.parse(fs.readFileSync(SHOPS_PATH, "utf-8"));
  const total = raw.length;

  let created = 0, updated = 0, skipped = 0, virtualUsersCreated = 0;

  // 100건씩 배치 처리 (DB 라운드트립 폭증 방지 + 트랜잭션 길이 제한 회피)
  const CHUNK = 100;
  for (let i = 0; i < raw.length; i += CHUNK) {
    const batch = raw.slice(i, i + CHUNK);
    await Promise.all(batch.map(async (row) => {
      // externalId 없는 옛날 데이터는 스킵 (재스크랩 후 자연 채움)
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
        hit:       row.hit   ?? 0,
        price:     row.price ?? 0,
        mainPhoto: row.mainPhoto ?? "",
        photos:    Array.isArray(row.photos) ? row.photos
                 : typeof row.photos === "string" && row.photos
                   ? row.photos.split(",").map((s) => s.trim()).filter(Boolean)
                   : [],
        time1:     row.time1 ?? "",
        time2:     row.time2 ?? "",
        timeFull:  Boolean(row.timeFull),
        isScraped: true,
        lastScrapedAt: row.scrapedAt ? new Date(row.scrapedAt) : new Date(),
      };

      // 스마트 upsert: externalId 기준
      const existing = await prisma.shop.findUnique({
        where: { externalId: row.externalId },
        select: { id: true, virtualUserId: true },
      });

      let shopId: number;
      if (existing) {
        await prisma.shop.update({ where: { externalId: row.externalId }, data });
        shopId = existing.id;
        updated++;
      } else {
        const newShop = await prisma.shop.create({
          data: { ...data, externalId: row.externalId },
          select: { id: true },
        });
        shopId = newShop.id;
        created++;
      }

      // 가상 user lazy 생성 (이미 있으면 no-op)
      const hadVirtual = !!existing?.virtualUserId;
      try {
        await ensureVirtualUserForShop({ id: shopId, company: data.company });
        if (!hadVirtual) virtualUsersCreated++;
      } catch (e) {
        // 가상 user 생성 실패는 sync 실패가 아님 — 로그만
        console.error(`[sync] virtual user fail for shopId=${shopId}:`, e);
      }
    }));
  }

  const upserted = created + updated;
  revalidatePath("/admin/sync");
  revalidatePath("/admin/analytics");

  return {
    ok: true,
    total, upserted, created, updated, skipped,
    virtualUsersCreated,
    durationMs: Date.now() - t0,
  };
}

// ── 마지막 sync 정보 조회 ─────────────────────────────────────────────
export async function getSyncStatus(): Promise<{
  totalShops:      number;
  scrapedShops:    number;
  ownedShops:      number;
  virtualShops:    number;
  withExternalId:  number;
  lastScrapedAt:   Date | null;
}> {
  const [totalShops, scrapedShops, ownedShops, virtualShops, withExternalId, lastScraped] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { isScraped: true } }),
    prisma.shop.count({ where: { ownerId: { not: null } } }),
    prisma.shop.count({ where: { virtualUserId: { not: null } } }),
    prisma.shop.count({ where: { externalId: { not: null } } }),
    prisma.shop.findFirst({
      where:  { lastScrapedAt: { not: null } },
      orderBy: { lastScrapedAt: "desc" },
      select: { lastScrapedAt: true },
    }),
  ]);
  return {
    totalShops,
    scrapedShops,
    ownedShops,
    virtualShops,
    withExternalId,
    lastScrapedAt: lastScraped?.lastScrapedAt ?? null,
  };
}
