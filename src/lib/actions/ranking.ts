"use server";

import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/siteConfig";

export type RankingMode = "balance" | "period";

export interface RankingRow {
  rank:     number;
  userId:   number;
  username: string;
  nickname: string;
  points:   number;          // mode=balance 면 잔액, mode=period 면 기간 누적 +
  title?:   string | null;   // 칭호 (있으면 표시)
}

const CACHE_TTL_MS = 60 * 60_000;            // 1시간
const cache = new Map<string, { at: number; data: RankingRow[] }>();

function cacheKey(mode: RankingMode, startMs: number, endMs: number, limit: number): string {
  return `${mode}|${startMs}|${endMs}|${limit}`;
}

/**
 * 랭킹 조회 — 두 모드 지원, 1시간 캐시.
 *  - mode="balance"  : User.points 잔액 desc
 *  - mode="period"   : startDate~endDate 동안 PointLog amount>0 합산 desc
 *
 * 자동 제외:
 *  - isVirtual=true (스크랩 가상 계정)
 *  - role=ADMIN
 *  - SiteConfig.rankingExcludedUsernames 에 등록된 username
 */
export async function getRankings(
  mode: RankingMode,
  startDate?: Date,
  endDate?: Date,
  limit = 100,
): Promise<RankingRow[]> {
  const startMs = startDate?.getTime() ?? 0;
  const endMs   = endDate?.getTime()   ?? 0;
  const key = cacheKey(mode, startMs, endMs, limit);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const config = await getSiteConfig();
  const excludeUsernames = config.rankingExcludedUsernames ?? [];

  // 항상 제외할 조건
  const excludeWhere = {
    isVirtual: false,
    role: { not: "ADMIN" as const },
    ...(excludeUsernames.length > 0 ? { username: { notIn: excludeUsernames } } : {}),
  };

  let rows: RankingRow[];

  if (mode === "balance") {
    const users = await prisma.user.findMany({
      where: excludeWhere,
      orderBy: { points: "desc" },
      take: limit,
      select: { id: true, username: true, nickname: true, points: true, title: true },
    });
    rows = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      nickname: u.nickname,
      points: u.points,
      title:  u.title,
    }));
  } else {
    if (!startDate || !endDate) {
      throw new Error("기간 모드에는 startDate/endDate 필수");
    }
    // groupBy 후 user 정보 join — 제외 후 limit 채우기 위해 limit*3 까지 가져옴
    const aggregated = await prisma.pointLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        amount:    { gt: 0 },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: limit * 3,
    });
    const userIds = aggregated.map((a) => a.userId);
    const users = userIds.length === 0 ? [] : await prisma.user.findMany({
      where: { id: { in: userIds }, ...excludeWhere },
      select: { id: true, username: true, nickname: true, title: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    rows = aggregated
      .map((a) => {
        const u = userMap.get(a.userId);
        if (!u) return null;
        return {
          userId:   u.id,
          username: u.username,
          nickname: u.nickname,
          points:   a._sum.amount ?? 0,
          title:    u.title,
        };
      })
      .filter((r): r is { userId: number; username: string; nickname: string; points: number; title: string | null } => r !== null)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r }));
  }

  cache.set(key, { at: Date.now(), data: rows });
  return rows;
}

/** 포인트 발생 이벤트 후 호출 — 캐시 즉시 무효화. */
export async function clearRankingCache(): Promise<void> {
  cache.clear();
}
