/**
 * /jobs 게시판 샘플 시드 — [구인] 1건, [구직] 1건
 * 실행: npx tsx scripts/seed-sample-jobs.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, UserStatus } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function ensureUser(username: string, nickname: string, role: UserRole) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing;
  return prisma.user.create({
    data: { username, nickname, passwordHash: "", role, status: UserStatus.ACTIVE, memo: "[샘플]" },
  });
}

async function main() {
  const shop = await ensureUser("_demo_shop_jobs", "강남업소", UserRole.SHOP);
  const user = await ensureUser("_demo_user_jobs", "취준생A",   UserRole.USER);

  await prisma.boardPost.create({
    data: {
      category: "jobs",
      title: "[구인] 강남 매장 매니저 모집 (월 350만원~)",
      content:
        "강남 신논현 인근 매장에서 매니저를 모집합니다.\n\n" +
        "▶ 근무 조건\n" +
        "  · 주 5일 / 18:00 ~ 익일 04:00\n" +
        "  · 월 350만원 + 인센티브\n" +
        "  · 4대보험 + 주휴수당\n\n" +
        "▶ 자격\n" +
        "  · 매장 운영 경험자 우대\n" +
        "  · 친절한 응대 가능자\n\n" +
        "▶ 연락\n" +
        "  · 댓글로 문의 주세요. 쪽지로 추가 정보 안내드립니다.",
      authorId: shop.id,
    },
  });

  await prisma.boardPost.create({
    data: {
      category: "jobs",
      title: "[구직] 강북권 평일 야간 일자리 찾습니다",
      content:
        "안녕하세요. 강북권에서 평일 야간 일자리를 찾고 있습니다.\n\n" +
        "▶ 가능 시간: 평일 20:00 ~ 03:00\n" +
        "▶ 경력: 매장 홀 1년\n" +
        "▶ 희망: 월 250만원 + α\n\n" +
        "성실하게 일하겠습니다. 댓글 또는 쪽지로 연락 부탁드립니다.",
      authorId: user.id,
    },
  });

  console.log("✅ 2건 등록 — [구인] / [구직]");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
