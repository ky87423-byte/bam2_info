/**
 * sendMessageAction 분기 시뮬레이션 — _dev_user(109) 발신 기준 3가지 시나리오:
 *   A) _dev_user → admin            (real → real, Message)
 *   B) _dev_user → 가상 업소 (ownerless) (real → virtual, AdminInquiry 우회)
 *   C) _dev_user → 가상 업소 (ownerId 있음) (real → owner 에게 직접 Message)
 *
 * 실제 sendMessageAction 의 로직을 그대로 따라가되 auth() 를 우회하고 senderId=109 로 고정.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function send(senderId: number, receiverId: number, content: string) {
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, status: true, isVirtual: true, nickname: true },
  });
  if (!receiver) return { ok: false, error: "수신자 미존재" };

  if (receiver.isVirtual) {
    const shop = await prisma.shop.findUnique({
      where:  { virtualUserId: receiver.id },
      select: { id: true, company: true, ownerId: true },
    });
    if (!shop) return { ok: false, error: "가상 계정 ↔ 업소 매핑 끊김" };

    if (shop.ownerId && shop.ownerId !== senderId) {
      const direct = await prisma.message.create({
        data: { senderId, receiverId: shop.ownerId, content },
        select: { id: true },
      });
      return { ok: true, kind: "direct-via-owner" as const, id: direct.id, shop: shop.company, ownerId: shop.ownerId };
    }

    const inquiry = await prisma.adminInquiry.create({
      data: { senderId, shopId: shop.id, virtualUserId: receiver.id, content },
      select: { id: true },
    });
    return { ok: true, kind: "inquiry" as const, id: inquiry.id, shop: shop.company };
  }

  const msg = await prisma.message.create({
    data: { senderId, receiverId, content },
    select: { id: true },
  });
  return { ok: true, kind: "direct" as const, id: msg.id, receiverNickname: receiver.nickname };
}

async function main() {
  const SENDER = 109; // _dev_user
  const ADMIN  = 100; // admin

  // 가상 업소 — ownerless 1건 + ownerId 있는 1건 식별
  const ownerlessVirtual = await prisma.user.findFirst({
    where: { isVirtual: true, id: { in: (await prisma.shop.findMany({ where: { virtualUserId: { not: null }, ownerId: null }, select: { virtualUserId: true } })).map(s => s.virtualUserId!) } },
    select: { id: true, nickname: true },
  });
  const ownedVirtual = await prisma.user.findFirst({
    where: { isVirtual: true, id: { in: (await prisma.shop.findMany({ where: { virtualUserId: { not: null }, ownerId: { not: null } }, select: { virtualUserId: true } })).map(s => s.virtualUserId!) } },
    select: { id: true, nickname: true },
  });

  console.log("[setup]");
  console.log(`  sender = ${SENDER} (_dev_user)`);
  console.log(`  ownerless virtual = ${ownerlessVirtual?.id} (${ownerlessVirtual?.nickname})`);
  console.log(`  owned virtual     = ${ownedVirtual?.id} (${ownedVirtual?.nickname})`);

  console.log("\n[A] _dev_user → admin");
  console.log("  ", await send(SENDER, ADMIN, "[probe-A] _dev_user → admin (real→real, Message)"));

  if (ownerlessVirtual) {
    console.log("\n[B] _dev_user → ownerless 가상 업소 (AdminInquiry 우회 기대)");
    console.log("  ", await send(SENDER, ownerlessVirtual.id, "[probe-B] _dev_user → 가상 업소 (ownerless)"));
  } else {
    console.log("\n[B] skip — ownerless 가상 업소 없음");
  }

  if (ownedVirtual) {
    console.log("\n[C] _dev_user → owner-claimed 가상 업소 (owner 에게 직접 Message 기대)");
    console.log("  ", await send(SENDER, ownedVirtual.id, "[probe-C] _dev_user → 가상 업소 (claimed)"));
  } else {
    console.log("\n[C] skip — claimed 가상 업소 없음");
  }

  console.log("\n[counts after]");
  console.log("  Message total =", await prisma.message.count());
  console.log("  Message unacked (admin badge) =", await prisma.message.count({ where: { adminAcknowledgedAt: null } }));
  console.log("  AdminInquiry NEW =", await prisma.adminInquiry.count({ where: { status: "NEW" } }));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
