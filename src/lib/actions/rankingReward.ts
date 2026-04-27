"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/data";
import { getRankings, type RankingMode, clearRankingCache } from "./ranking";

// ── 보너스 포인트 정책 ───────────────────────────────────────────────────
const BONUS_BY_RANK: Record<number, number> = { 1: 50000, 2: 30000, 3: 10000 };

// ── 시스템 발신 sender (admin 계정 사용) — 별도 system user 만들지 않음 ─
async function getSystemSenderId(): Promise<number> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isVirtual: false },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return admin?.id ?? 100;
}

// ── 기간 계산 ────────────────────────────────────────────────────────────
//   weekly: 지난 주 월요일 0시 ~ 일요일 23:59:59 (KST 가정)
//   monthly: 지난 달 1일 0시 ~ 말일 23:59:59
//   custom: 호출자가 start/end 직접 전달
function periodRange(
  type: "WEEKLY" | "MONTHLY" | "CUSTOM",
  customStart?: Date,
  customEnd?: Date,
  refDate: Date = new Date(),
) {
  if (type === "CUSTOM") {
    if (!customStart || !customEnd) throw new Error("CUSTOM 기간은 customStart/customEnd 필수");
    const start = new Date(customStart); start.setHours(0, 0, 0, 0);
    const end   = new Date(customEnd);   end.setHours(23, 59, 59, 999);
    const sStr = start.toISOString().slice(0, 10).replace(/-/g, "");
    const eStr = end.toISOString().slice(0, 10).replace(/-/g, "");
    return {
      start, end,
      periodKey: `${sStr}-${eStr}-custom`,
      label:     `${start.toISOString().slice(0, 10)} ~ ${end.toISOString().slice(0, 10)}`,
    };
  }
  if (type === "WEEKLY") {
    // 지난 주 (이번 주 월요일 - 7일 ~ 이번 주 월요일 - 1일)
    const day = refDate.getDay() || 7;            // 일요일=0 → 7
    const thisMonday = new Date(refDate);
    thisMonday.setDate(refDate.getDate() - day + 1);
    thisMonday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday); lastSunday.setDate(thisMonday.getDate() - 1);
    lastSunday.setHours(23, 59, 59, 999);
    // ISO week 번호 기반 key
    const yr = lastMonday.getFullYear();
    const week = isoWeekNumber(lastMonday);
    return { start: lastMonday, end: lastSunday, periodKey: `${yr}-W${String(week).padStart(2, "0")}-weekly`, label: `${yr}년 ${week}주차` };
  } else {
    // 지난 달
    const lastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(refDate.getFullYear(), refDate.getMonth(), 0, 23, 59, 59, 999);
    const yr = lastMonth.getFullYear();
    const mo = lastMonth.getMonth() + 1;
    return { start: lastMonth, end: lastMonthEnd, periodKey: `${yr}-${String(mo).padStart(2, "0")}-monthly`, label: `${yr}년 ${mo}월` };
  }
}

function isoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604_800_000);
}

// ── 메인 정산 액션 ────────────────────────────────────────────────────────
export async function settleRankingAction(input: {
  periodType:   "WEEKLY" | "MONTHLY" | "CUSTOM";
  mode:         "balance" | "period";          // 정산 기준
  customStart?: string;                        // "YYYY-MM-DD" — periodType=CUSTOM 일 때 필수
  customEnd?:   string;
}) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false as const, error: "권한 없음" };

  let range;
  try {
    range = input.periodType === "CUSTOM"
      ? periodRange("CUSTOM",
          input.customStart ? new Date(input.customStart) : undefined,
          input.customEnd   ? new Date(input.customEnd)   : undefined)
      : periodRange(input.periodType);
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
  const { start, end, periodKey, label } = range;

  // CUSTOM 은 항상 period 모드 강제 (보유 잔액은 시점 무관이라 의미 없음)
  const effectiveMode: "balance" | "period" = input.periodType === "CUSTOM" ? "period" : input.mode;

  // 이미 같은 periodKey 로 정산했으면 거절
  const existing = await prisma.rankingReward.findFirst({ where: { periodKey } });
  if (existing) return { ok: false as const, error: `이미 정산됨: ${periodKey}` };

  // top 3 산정
  const top3 = await getRankings(
    effectiveMode as RankingMode,
    effectiveMode === "period" ? start : undefined,
    effectiveMode === "period" ? end   : undefined,
    3,
  );
  if (top3.length === 0) return { ok: false as const, error: "정산 대상 없음" };

  const senderId = await getSystemSenderId();
  const created: number[] = [];

  for (const r of top3) {
    const bonus = BONUS_BY_RANK[r.rank] ?? 0;
    const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉";
    const title = `${medal} ${label} ${r.rank}위`;
    const memo  = `랭킹 정산: ${title} (${effectiveMode === "balance" ? "보유 포인트" : "기간 획득"})`;

    // 트랜잭션: RankingReward 생성 + User.title 갱신 + 보너스 지급 + 자동 쪽지
    try {
      const reward = await prisma.rankingReward.create({
        data: {
          periodKey,
          periodType: input.periodType,
          mode:       effectiveMode === "balance" ? "BALANCE" : "PERIOD",
          startDate:  start,
          endDate:    end,
          rank:       r.rank,
          userId:     r.userId,
          username:   r.username,
          nickname:   r.nickname,
          points:     r.points,
          bonusPoints: bonus,
          title,
        },
        select: { id: true },
      });

      // User.title 갱신 (해당 정산 시각도 같이)
      await prisma.user.update({
        where: { id: r.userId },
        data:  { title, titleAwardedAt: new Date() },
      });

      // 보너스 포인트 지급 (PointLog 자동 기록 + 캐시 invalidate)
      if (bonus > 0) await awardPoints(r.userId, "admin", bonus, memo);

      // 자동 쪽지 (system → user)
      const dm = await prisma.message.create({
        data: {
          senderId,
          receiverId: r.userId,
          content: `🎉 축하합니다! ${title} 랭킹 보상이 지급되었습니다.\n\n• 보너스 포인트: ${bonus.toLocaleString()}P\n• 칭호: ${title}\n\n경품/기프티콘은 별도로 발송될 예정입니다.`,
        },
        select: { id: true },
      });

      // 발송 시각 기록
      await prisma.rankingReward.update({
        where: { id: reward.id },
        data:  { notifiedAt: new Date() },
      });

      created.push(r.userId);
      // 미사용 변수 경고 회피
      void dm;
    } catch (e) {
      console.error(`[settle] rank=${r.rank} userId=${r.userId} 실패:`, e);
    }
  }

  await clearRankingCache();
  revalidatePath("/admin/rankings");
  revalidatePath("/");
  return { ok: true as const, periodKey, label, awarded: created };
}

// ── 경품 발송 처리 ────────────────────────────────────────────────────────
export async function markPrizeShippedAction(rewardId: number, shipped: boolean, memo: string) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false as const, error: "권한 없음" };
  const adminId = session?.user?.id ? parseInt(session.user.id, 10) : null;

  await prisma.rankingReward.update({
    where: { id: rewardId },
    data: {
      prizeShipped: shipped,
      prizeMemo:    memo,
      shippedAt:    shipped ? new Date() : null,
      shippedBy:    shipped && adminId ? adminId : null,
    },
  });
  revalidatePath("/admin/rankings");
  return { ok: true as const };
}

// ── 보상 이력 조회 ────────────────────────────────────────────────────────
export async function getRewardHistory(limit = 30) {
  const session = await auth();
  if (session?.user?.role !== "admin") return [];
  return prisma.rankingReward.findMany({
    orderBy: [{ createdAt: "desc" }, { rank: "asc" }],
    take: limit,
  });
}
