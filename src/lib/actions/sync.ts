"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureVirtualUserForShop } from "@/lib/virtualUsers";

const SHOPS_PATH = path.join(process.cwd(), "scraper", "scraped_data", "shops.json");
const URLS_PATH  = path.join(process.cwd(), "scraper", "scraped_data", "urls.json");

// 미관측 → 상태 전환 임계값
const ARCHIVE_AFTER_DAYS    = 30;   // 30일 + 3회 이상 미관측 → ARCHIVED
const ARCHIVE_AFTER_STREAK  = 3;

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

      // 공통 필드 (신규/업데이트 모두 적용)
      const baseData = {
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
        // ⚠ update 시 hit 는 제외 — 우리 사이트에서 누적된 조회수 보존
        await prisma.shop.update({ where: { externalId: row.externalId }, data: baseData });
        shopId = existing.id;
        updated++;
      } else {
        // 신규: 원본 사이트의 hit 를 초기값으로 가져옴
        const newShop = await prisma.shop.create({
          data: { ...baseData, hit: row.hit ?? 0, externalId: row.externalId },
          select: { id: true },
        });
        shopId = newShop.id;
        created++;
      }

      // 가상 user lazy 생성 (이미 있으면 no-op)
      const hadVirtual = !!existing?.virtualUserId;
      try {
        await ensureVirtualUserForShop({ id: shopId, company: baseData.company });
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

// ── 가시성 추적 sync (urls.json ↔ DB) ─────────────────────────────────
// 스크래퍼가 매 실행마다 저장하는 urls.json (현재 소스 목록 스냅샷)을
// DB의 Shop.externalId 와 대조해 lastSeenInListAt / sourceStatus 갱신.
export interface VisibilitySyncResult {
  ok:               true;
  listedCount:      number;   // urls.json 의 wr_id 수
  seenUpdated:      number;   // ACTIVE 로 갱신된 Shop 수
  missingIncreased: number;   // missingStreak +1 된 Shop 수
  archived:         number;   // ARCHIVED 로 전환된 Shop 수
  durationMs:       number;
}

export type VisibilitySyncActionResult =
  | VisibilitySyncResult
  | { ok: false; error: string };

export async function syncListVisibilityAction(): Promise<VisibilitySyncActionResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  if (!fs.existsSync(URLS_PATH)) {
    return { ok: false, error: `urls.json 파일을 찾을 수 없습니다 (${URLS_PATH})` };
  }

  const t0 = Date.now();
  const listed: Array<{ wr_id: string }> = JSON.parse(fs.readFileSync(URLS_PATH, "utf-8"));

  // 1) urls.json 의 wr_id 집합 (숫자형으로 정규화)
  const seenIds = new Set<number>();
  for (const row of listed) {
    const id = parseInt(row.wr_id, 10);
    if (!isNaN(id)) seenIds.add(id);
  }
  const seenIdsArr = [...seenIds];

  // 2) 관측됨 → ACTIVE 로 일괄 갱신
  const seenUpdate = await prisma.shop.updateMany({
    where: { externalId: { in: seenIdsArr } },
    data: {
      lastSeenInListAt: new Date(),
      sourceStatus:     "ACTIVE",
      missingStreak:    0,
    },
  });

  // 3) DB 에 있는 스크랩 Shop 중 이번 목록에 없는 항목 → missingStreak +1
  //    (대량일 수 있어 raw SQL 로 원샷; 빈 배열이면 ALL(empty) 가 true 되어 전체 갱신되므로 가드)
  const missingResult = seenIdsArr.length === 0 ? 0 : await prisma.$executeRaw`
    UPDATE "Shop"
    SET "missingStreak" = "missingStreak" + 1,
        "sourceStatus"  = CASE
          WHEN "sourceStatus" = 'ACTIVE' THEN 'MISSING'::"SourceStatus"
          ELSE "sourceStatus"
        END
    WHERE "isScraped" = true
      AND "externalId" IS NOT NULL
      AND "externalId" <> ALL(${seenIdsArr}::int[])
  `;

  // 4) 30일+ & 3회+ 미관측 → ARCHIVED 전환
  const archiveCutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 3600 * 1000);
  const archived = await prisma.shop.updateMany({
    where: {
      isScraped:        true,
      sourceStatus:     { in: ["MISSING"] },
      missingStreak:    { gte: ARCHIVE_AFTER_STREAK },
      lastSeenInListAt: { lt: archiveCutoff },
    },
    data: { sourceStatus: "ARCHIVED" },
  });

  revalidatePath("/admin/sync");

  return {
    ok: true,
    listedCount:      seenIds.size,
    seenUpdated:      seenUpdate.count,
    missingIncreased: Number(missingResult),
    archived:         archived.count,
    durationMs:       Date.now() - t0,
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
  lastSeenInListAt: Date | null;
  bySourceStatus:  Record<"ACTIVE" | "MISSING" | "DELETED_CONFIRMED" | "ARCHIVED", number>;
}> {
  const [
    totalShops, scrapedShops, ownedShops, virtualShops, withExternalId,
    lastScraped, lastSeenInList,
    active, missing, deleted, archived,
  ] = await Promise.all([
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
    prisma.shop.findFirst({
      where:   { lastSeenInListAt: { not: null } },
      orderBy: { lastSeenInListAt: "desc" },
      select:  { lastSeenInListAt: true },
    }),
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "ACTIVE" } }),
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "MISSING" } }),
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "DELETED_CONFIRMED" } }),
    prisma.shop.count({ where: { isScraped: true, sourceStatus: "ARCHIVED" } }),
  ]);
  return {
    totalShops,
    scrapedShops,
    ownedShops,
    virtualShops,
    withExternalId,
    lastScrapedAt:    lastScraped?.lastScrapedAt ?? null,
    lastSeenInListAt: lastSeenInList?.lastSeenInListAt ?? null,
    bySourceStatus: {
      ACTIVE:             active,
      MISSING:             missing,
      DELETED_CONFIRMED:  deleted,
      ARCHIVED:            archived,
    },
  };
}
