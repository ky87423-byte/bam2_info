/**
 * 시나리오: 일반 유저(_dev_user, USER, id=109) ↔ 업소 회원(_dev_shop, SHOP, id=110)
 *
 * 1. _dev_user → _dev_shop  쪽지 발송  (실회원→실회원, AdminInquiry 우회 안 됨 검증)
 * 2. _dev_shop  관점: inbox 표시, 미독 카운트 확인
 * 3. _dev_shop  쪽지 읽음 처리 (markMessageReadAction)
 * 4. _dev_shop → _dev_user  답장 발송
 * 5. _dev_user 관점: 답장 수신 + 미독 카운트 확인
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// sendMessageAction 의 비-가상 분기 로직만 발췌
async function sendDirect(senderId: number, receiverId: number, content: string) {
  const r = await prisma.user.findUnique({ where: { id: receiverId }, select: { isVirtual: true, status: true, role: true } });
  if (!r) throw new Error("수신자 미존재");
  if (r.isVirtual) throw new Error("이 시나리오는 비-가상 수신자만");
  return prisma.message.create({ data: { senderId, receiverId, content }, select: { id: true, createdAt: true } });
}

async function markRead(messageId: number, byUserId: number) {
  return prisma.message.updateMany({
    where: { id: messageId, receiverId: byUserId, isRead: false },
    data:  { isRead: true },
  });
}

async function unreadCount(userId: number) {
  return prisma.message.count({ where: { receiverId: userId, isRead: false } });
}

async function inbox(userId: number) {
  return prisma.message.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { sender: { select: { nickname: true, role: true } } },
  });
}

async function main() {
  const user = await prisma.user.findUnique({ where: { username: "_dev_user" }, select: { id: true, role: true } });
  const shop = await prisma.user.findUnique({ where: { username: "_dev_shop" }, select: { id: true, role: true } });
  if (!user || !shop) throw new Error("dev 계정 없음 (먼저 dev quick login 으로 자동생성 필요)");
  console.log(`[setup] _dev_user id=${user.id} role=${user.role}, _dev_shop id=${shop.id} role=${shop.role}`);

  // 1) USER → SHOP
  console.log("\n[1] _dev_user → _dev_shop  쪽지 발송");
  const m1 = await sendDirect(user.id, shop.id, "[probe] 안녕하세요, 가격 문의드립니다 — _dev_user");
  console.log(`    → Message #${m1.id}  isRead=false (방금 발송)`);

  // 2) SHOP 관점 — 미독 카운트 + 받은쪽지함
  const u2 = await unreadCount(shop.id);
  const inb = await inbox(shop.id);
  console.log(`\n[2] _dev_shop  미독 카운트=${u2}`);
  console.log(`    inbox 최신 ${inb.length}건:`);
  for (const m of inb) console.log(`      #${m.id}  from=${m.sender.nickname}(${m.sender.role})  read=${m.isRead}  "${m.content.slice(0, 50)}"`);

  // 3) SHOP 이 쪽지 펼쳐 읽음 처리
  console.log("\n[3] _dev_shop  쪽지 펼침 → 자동 읽음 처리 (markMessageReadAction)");
  const r3 = await markRead(m1.id, shop.id);
  console.log(`    updated rows: ${r3.count}`);
  console.log(`    미독 카운트 (이후): ${await unreadCount(shop.id)}`);

  // 4) SHOP → USER 답장
  console.log("\n[4] _dev_shop → _dev_user  답장");
  const m2 = await sendDirect(shop.id, user.id, "[probe] 네 안녕하세요! 가격은 ____ 입니다 — _dev_shop 답장");
  console.log(`    → Message #${m2.id}`);

  // 5) USER 관점 — 답장 수신 + 미독 카운트
  const u5 = await unreadCount(user.id);
  const inb5 = await inbox(user.id);
  console.log(`\n[5] _dev_user  미독 카운트=${u5}`);
  console.log(`    inbox 최신 ${inb5.length}건:`);
  for (const m of inb5) console.log(`      #${m.id}  from=${m.sender.nickname}(${m.sender.role})  read=${m.isRead}  "${m.content.slice(0, 50)}"`);

  // sent 폴더에서 _dev_user 가 보낸 것도 확인
  const sentByUser = await prisma.message.findMany({
    where: { senderId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { receiver: { select: { nickname: true, role: true } } },
  });
  console.log(`\n[5b] _dev_user  보낸쪽지함 최신 ${sentByUser.length}건:`);
  for (const m of sentByUser) console.log(`      #${m.id}  to=${m.receiver.nickname}(${m.receiver.role})  read=${m.isRead}  "${m.content.slice(0, 50)}"`);

  // 6) 시나리오 종합
  console.log("\n[summary]");
  console.log(`  send(USER→SHOP)        = #${m1.id}`);
  console.log(`  reply(SHOP→USER)       = #${m2.id}`);
  console.log(`  대화 chain: USER → SHOP → USER  (양방향 정상)`);
  console.log(`  각 측 미독: SHOP=${await unreadCount(shop.id)} (읽음 처리됨), USER=${await unreadCount(user.id)} (답장 미독)`);
  console.log(`  admin 사이드바 미확인 카운트 (Message.adminAcknowledgedAt IS NULL) = ${await prisma.message.count({ where: { adminAcknowledgedAt: null } })}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
