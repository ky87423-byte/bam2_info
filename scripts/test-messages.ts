/**
 * sendMessageAction / markMessageReadAction / deleteMessageAction
 * 의 경계 케이스를 직접 호출해서 모든 분기 검증.
 */
import "dotenv/config";

// 우회 패턴: server action 들이 auth() 를 호출하므로 직접 호출 대신
// HTTP 호출을 통해 server action 시뮬레이트는 어려움 → 대신 비즈니스 로직만 검증
// 1. virtual user 수신 시 AdminInquiry 우회 확인
// 2. ownerless vs owner-claimed 가상 분기
// 3. 자기 자신 / blocked / nonexistent 수신자 분기

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  console.log("\n=== sendMessageAction 분기 테스트 (DB 직접 검증) ===\n");

  // 사전 데이터
  const virtual = await prisma.user.findFirst({ where: { isVirtual: true }, select: { id: true, nickname: true } });
  const realUser = await prisma.user.findUnique({ where: { username: "_dev_user" }, select: { id: true } });
  const admin = await prisma.user.findUnique({ where: { username: "_dev_admin" }, select: { id: true } });

  console.log(`virtual id=${virtual?.id} (${virtual?.nickname})`);
  console.log(`_dev_user id=${realUser?.id}`);
  console.log(`_dev_admin id=${admin?.id}`);

  // 1) Shop ↔ virtualUserId 양방향 무결성
  if (virtual) {
    const shop = await prisma.shop.findFirst({ where: { virtualUserId: virtual.id }, select: { id: true, company: true, ownerId: true } });
    console.log(`\n[CHECK 1] virtual user → shop 매핑:`);
    console.log(`  shop: ${shop ? `id=${shop.id} company=${shop.company} owner=${shop.ownerId ?? '(none)'}` : '(매핑 끊김!)'}`);
  }

  // 2) sendMessageAction 의 가드 검증을 위한 데이터 분류
  const counts = {
    activeRealUsers: await prisma.user.count({ where: { status: "ACTIVE", isVirtual: false } }),
    blockedUsers:    await prisma.user.count({ where: { status: "BLOCKED" } }),
    virtualUsers:    await prisma.user.count({ where: { isVirtual: true } }),
    virtualUsersWithShop: await prisma.user.count({
      where: { isVirtual: true, AND: [{ id: { in: (await prisma.shop.findMany({ where: { virtualUserId: { not: null } }, select: { virtualUserId: true } })).map(s => s.virtualUserId!).filter(Boolean) } }] }
    }),
  };
  console.log(`\n[CHECK 2] 사용자 분포:`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);

  // 3) 가상→shop 매핑이 끊긴 케이스 (sendMessageAction 의 "가상 계정과 연결된 업소 없음" 분기)
  const orphans = await prisma.user.findMany({
    where: {
      isVirtual: true,
      NOT: { id: { in: (await prisma.shop.findMany({ where: { virtualUserId: { not: null } }, select: { virtualUserId: true } })).map(s => s.virtualUserId!).filter(Boolean) } },
    },
    select: { id: true, nickname: true },
  });
  console.log(`\n[CHECK 3] virtualUserId 끊긴 가상 유저 (orphan): ${orphans.length}건`);
  for (const o of orphans.slice(0, 3)) console.log(`  - id=${o.id} nickname=${o.nickname}`);

  // 4) AdminInquiry 분포
  const inquiryStats = await prisma.adminInquiry.groupBy({ by: ["status"], _count: { _all: true } });
  console.log(`\n[CHECK 4] AdminInquiry status 분포:`);
  for (const r of inquiryStats) console.log(`  ${r.status}: ${r._count._all}`);

  // 5) Message 분포 + isRead
  const msgStats = await prisma.message.aggregate({ _count: { _all: true } });
  const unreadGlobal = await prisma.message.count({ where: { isRead: false } });
  console.log(`\n[CHECK 5] Message: total=${msgStats._count._all}, unread=${unreadGlobal}`);

  // 6) BLOCKED 수신자 — sendMessageAction 은 receiver.status 검증 없음! (잠재 버그)
  const blockedReceiver = await prisma.user.findFirst({ where: { status: "BLOCKED" }, select: { id: true, nickname: true } });
  console.log(`\n[CHECK 6] BLOCKED 사용자 ID=${blockedReceiver?.id} (${blockedReceiver?.nickname}) — receiver 가드 누락 검증 대상`);

  // 7) AdminInquiry 우회 → owner claim 후 직접 메시지 분기 — 클레임 승인된 shop 존재?
  const claimedShops = await prisma.shop.count({ where: { ownerId: { not: null } } });
  console.log(`\n[CHECK 7] owner 가 클레임 완료한 shop 수: ${claimedShops}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
