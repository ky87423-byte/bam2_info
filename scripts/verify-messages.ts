/**
 * 쪽지 시스템 동작 확인
 * 실행: tsx scripts/verify-messages.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log("━".repeat(60));
  console.log("📨  Message 시스템 동작 확인");
  console.log("━".repeat(60));

  const [admin, user] = await Promise.all([
    prisma.user.findFirst({ where: { role: "ADMIN" } }),
    prisma.user.findFirst({ where: { role: "USER", status: "ACTIVE" } }),
  ]);
  if (!admin || !user) throw new Error("admin 또는 일반 user 없음");

  // 기존 테스트 쪽지 정리
  await prisma.message.deleteMany({ where: { content: { startsWith: "[TEST]" } } });

  // 1) admin → user 쪽지 1건
  await prisma.message.create({
    data: { senderId: admin.id, receiverId: user.id, content: "[TEST] 관리자가 보낸 쪽지" },
  });
  // 2) user → admin 쪽지 1건 (관리자 받은 쪽지)
  await prisma.message.create({
    data: { senderId: user.id, receiverId: admin.id, content: "[TEST] 일반 유저가 보낸 답장" },
  });
  // 3) admin → user 두 번째 쪽지 (안 읽은 것 누적)
  await prisma.message.create({
    data: { senderId: admin.id, receiverId: user.id, content: "[TEST] 두 번째 쪽지" },
  });

  // 카운트 확인
  const [adminUnread, userUnread] = await Promise.all([
    prisma.message.count({ where: { receiverId: admin.id, isRead: false } }),
    prisma.message.count({ where: { receiverId: user.id,  isRead: false } }),
  ]);

  console.log(`\n${admin.username}(admin) 받은 안 읽은 쪽지: ${adminUnread}건`);
  console.log(`${user.username}(user) 받은 안 읽은 쪽지: ${userUnread}건`);

  // 첫 쪽지를 읽음 처리
  const firstToUser = await prisma.message.findFirst({
    where: { receiverId: user.id, content: "[TEST] 관리자가 보낸 쪽지" },
  });
  if (firstToUser) {
    await prisma.message.updateMany({
      where: { id: firstToUser.id, receiverId: user.id, isRead: false },
      data: { isRead: true },
    });
    const userUnreadAfter = await prisma.message.count({ where: { receiverId: user.id, isRead: false } });
    console.log(`→ 첫 쪽지 읽음 처리 후 ${user.username} 안 읽은 쪽지: ${userUnreadAfter}건`);
  }

  // 전체 통계
  const total = await prisma.message.count();
  console.log(`\n📊 전체 Message 테이블 행 수: ${total}건`);
  console.log("━".repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
