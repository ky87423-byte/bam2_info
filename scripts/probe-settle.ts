/**
 * settleRankingAction 비즈니스 로직 시뮬 — admin auth 우회 + Prisma 직접 호출.
 * 실제 server action 과 동일한 흐름:
 *   1) top 3 산정
 *   2) RankingReward 생성
 *   3) User.title + titleAwardedAt 갱신
 *   4) awardPoints (User.points + PointLog)
 *   5) Message 생성 (system → 수상자)
 *   6) notifiedAt 기록
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const periodKey = "PROBE-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");
  console.log(`\n=== probe settle: ${periodKey} ===\n`);

  // top 3 (보유 잔액 기준, admin/가상 제외)
  const top3 = await prisma.user.findMany({
    where: { isVirtual: false, role: { not: "ADMIN" } },
    orderBy: { points: "desc" },
    take: 3,
    select: { id: true, username: true, nickname: true, points: true, title: true },
  });
  console.log("[before] top3:");
  for (const u of top3) console.log(`  rank user=${u.id} ${u.nickname} ${u.points}P  title=${u.title ?? "(none)"}`);

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", isVirtual: false }, select: { id: true } });
  if (!admin) throw new Error("admin 없음");

  const BONUS: Record<number, number> = { 1: 50000, 2: 30000, 3: 10000 };

  for (let i = 0; i < top3.length; i++) {
    const u = top3[i];
    const rank = i + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
    const title = `${medal} probe ${rank}위`;
    const bonus = BONUS[rank];

    // RankingReward
    const reward = await prisma.rankingReward.create({
      data: {
        periodKey, periodType: "CUSTOM", mode: "BALANCE",
        startDate: new Date(Date.now() - 30 * 86400000),
        endDate:   new Date(),
        rank, userId: u.id, username: u.username, nickname: u.nickname,
        points: u.points, bonusPoints: bonus, title,
      },
      select: { id: true },
    });

    // User.title + 보너스
    const updated = await prisma.user.update({
      where: { id: u.id },
      data: {
        title, titleAwardedAt: new Date(),
        points: { increment: bonus },
      },
      select: { points: true, title: true },
    });
    await prisma.pointLog.create({
      data: {
        userId: u.id, username: u.username, action: "ADMIN",
        amount: bonus, balance: updated.points,
        memo: `랭킹 정산: ${title}`,
      },
    });

    // 자동 쪽지
    const dm = await prisma.message.create({
      data: {
        senderId: admin.id, receiverId: u.id,
        content: `🎉 축하합니다! ${title} 랭킹 보상이 지급되었습니다.\n\n• 보너스 포인트: ${bonus.toLocaleString()}P\n• 칭호: ${title}`,
      },
      select: { id: true },
    });

    await prisma.rankingReward.update({ where: { id: reward.id }, data: { notifiedAt: new Date() } });

    console.log(`  ✓ rank=${rank} ${u.nickname}: +${bonus.toLocaleString()}P, title="${updated.title}", DM=#${dm.id}`);
  }

  // 사후 검증
  console.log("\n[after] User.title 갱신 확인:");
  const after = await prisma.user.findMany({
    where: { id: { in: top3.map((u) => u.id) } },
    select: { id: true, nickname: true, points: true, title: true, titleAwardedAt: true },
  });
  for (const u of after) console.log(`  user=${u.id} ${u.nickname} ${u.points}P  title="${u.title}"  awardedAt=${u.titleAwardedAt?.toISOString()}`);

  console.log("\n[after] RankingReward 이력:");
  const rewards = await prisma.rankingReward.findMany({ where: { periodKey }, orderBy: { rank: "asc" } });
  for (const r of rewards) console.log(`  #${r.id} rank=${r.rank} ${r.nickname} bonus=${r.bonusPoints} shipped=${r.prizeShipped} dmSent=${r.notifiedAt ? "✓" : "✗"}`);

  console.log("\n[after] 자동 쪽지 (수상자 inbox):");
  for (const u of top3) {
    const msg = await prisma.message.findFirst({
      where: { receiverId: u.id, content: { contains: "축하합니다" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, isRead: true },
    });
    console.log(`  user=${u.id} ${u.nickname} → DM #${msg?.id} preview="${msg?.content.slice(0, 40)}..."`);
  }

  console.log("\n[after] PointLog 보상 기록:");
  const logs = await prisma.pointLog.findMany({
    where: { userId: { in: top3.map((u) => u.id) }, memo: { contains: "랭킹 정산" } },
    orderBy: { createdAt: "desc" }, take: 5,
    select: { userId: true, username: true, amount: true, memo: true },
  });
  for (const l of logs) console.log(`  ${l.username}: +${l.amount}P  "${l.memo}"`);

  await prisma.$disconnect();
  console.log("\n✓ 시뮬 완료");
}

main().catch((e) => { console.error(e); process.exit(1); });
