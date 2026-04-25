/**
 * 댓글 시스템 end-to-end 동작 확인 (일회성)
 * - 댓글 생성, 답글 생성, 행운 포인트 트랜잭션, 트리 조회, 삭제 처리
 *
 * 실행: tsx scripts/verify-comments.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PointAction } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const TARGET_TYPE = "promotion";
const TARGET_ID   = 1;

async function main() {
  console.log("━".repeat(64));
  console.log("🧪  Comment 시스템 동작 확인");
  console.log("━".repeat(64));

  // 1) 댓글 작성 가능한 유저 1명 픽
  const author = await prisma.user.findFirst({ where: { status: "ACTIVE" }, select: { id: true, username: true, points: true } });
  if (!author) throw new Error("ACTIVE 유저 없음");
  console.log(`\n작성자: ${author.username} (id=${author.id}, ${author.points}P 보유)`);

  // 2) 기존 테스트 댓글 정리 (멱등)
  const existing = await prisma.comment.deleteMany({
    where: { targetType: TARGET_TYPE, targetId: TARGET_ID, content: { startsWith: "[테스트]" } },
  });
  if (existing.count > 0) console.log(`기존 테스트 댓글 ${existing.count}개 삭제됨`);

  // 3) 톱-레벨 댓글 작성 + 행운 포인트 강제 당첨 시뮬레이션 (트랜잭션)
  const luckyAmount = 50;
  const result = await prisma.$transaction(async (tx) => {
    const top = await tx.comment.create({
      data: {
        targetType:  TARGET_TYPE,
        targetId:    TARGET_ID,
        authorId:    author.id,
        content:     "[테스트] 행운 당첨 댓글!",
        isLuckyWin:  true,
        luckyAmount,
      },
    });
    const newBalance = author.points + luckyAmount;
    await tx.user.update({ where: { id: author.id }, data: { points: newBalance } });
    await tx.pointLog.create({
      data: {
        userId: author.id, username: author.username,
        action: PointAction.LUCKY,
        amount: luckyAmount, balance: newBalance,
        memo: `🎉 댓글 행운 당첨 (${TARGET_TYPE} #${TARGET_ID})`,
      },
    });
    return { topId: top.id, balance: newBalance };
  });
  console.log(`\n✅ 행운 당첨 댓글 생성: id=${result.topId}, +${luckyAmount}P → 잔액 ${result.balance}P`);

  // 4) 답글 작성 (1단계만 허용 검증)
  const reply = await prisma.comment.create({
    data: {
      targetType: TARGET_TYPE, targetId: TARGET_ID,
      authorId:   author.id,
      parentId:   result.topId,
      content:    "[테스트] 답글입니다.",
    },
  });
  console.log(`✅ 답글 생성: id=${reply.id} (parentId=${result.topId})`);

  // 5) 2단계 깊이 시도 (서버 액션은 거부, 여기선 시연 위해 직접 시도 → 응용 단에서 차단)
  console.log("\n   2단계 답글 시도(서버 액션이 차단해야 정상)...");
  try {
    await prisma.comment.create({
      data: {
        targetType: TARGET_TYPE, targetId: TARGET_ID,
        authorId: author.id, parentId: reply.id,
        content: "[테스트] 답글의 답글 (DB 레벨에선 가능, 서버 액션이 차단)",
      },
    });
    console.log("   ⚠ DB는 허용 — 서버 액션 레벨에서만 차단됨 (의도대로)");
    // cleanup
    await prisma.comment.deleteMany({ where: { content: "[테스트] 답글의 답글 (DB 레벨에선 가능, 서버 액션이 차단)" } });
  } catch (e) {
    console.log("   DB 거부:", (e as Error).message);
  }

  // 6) 트리 조회 시뮬레이션
  const all = await prisma.comment.findMany({
    where: { targetType: TARGET_TYPE, targetId: TARGET_ID },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { nickname: true, role: true } } },
  });
  console.log(`\n📋 ${TARGET_TYPE} #${TARGET_ID} 댓글 ${all.length}개:`);
  for (const c of all) {
    const indent = c.parentId ? "    └─ " : "  • ";
    const lucky  = c.isLuckyWin ? ` 🎉+${c.luckyAmount}P` : "";
    const role   = c.author.role.toLowerCase();
    console.log(`${indent}[${c.id}] ${c.author.nickname}(${role}): "${c.content}"${lucky}`);
  }

  // 7) Soft delete
  await prisma.comment.update({ where: { id: reply.id }, data: { deletedAt: new Date() } });
  const afterDel = await prisma.comment.findUnique({ where: { id: reply.id }, select: { deletedAt: true } });
  console.log(`\n🗑  답글 soft delete: deletedAt=${afterDel?.deletedAt?.toISOString().slice(0, 19)}`);

  // 8) 최종 통계
  const [userCount, pointLogCount, commentCount, lastLog] = await Promise.all([
    prisma.user.count(),
    prisma.pointLog.count(),
    prisma.comment.count(),
    prisma.pointLog.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  console.log("\n" + "━".repeat(64));
  console.log("📊 DB 최종 상태");
  console.log(`   User      : ${userCount}건`);
  console.log(`   PointLog  : ${pointLogCount}건  (직전: ${lastLog?.action} ${(lastLog?.amount ?? 0) > 0 ? "+" : ""}${lastLog?.amount}P, "${lastLog?.memo}")`);
  console.log(`   Comment   : ${commentCount}건`);
  console.log("━".repeat(64));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
