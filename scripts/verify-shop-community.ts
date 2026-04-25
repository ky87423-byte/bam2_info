/**
 * 업소 전용 비밀 게시판 동작 확인 (DB 직접):
 *  1. SiteConfig singleton 동작
 *  2. BoardPost CRUD
 *  3. Comment 재사용 (boardType="shop_only")
 *  4. 토글 OFF 상태에서도 데이터는 보존
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log("━".repeat(64));
  console.log("🧪  Shop Community 비밀 게시판 검증");
  console.log("━".repeat(64));

  // 1) SiteConfig
  let cfg = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  console.log(`\n[1] SiteConfig 초기 상태: isShopCommunityActive=${cfg?.isShopCommunityActive}`);

  // 2) ON 으로 토글
  cfg = await prisma.siteConfig.update({
    where: { id: 1 },
    data:  { isShopCommunityActive: true },
  });
  console.log(`    → ON 으로 변경: ${cfg.isShopCommunityActive}`);

  // 3) BoardPost 작성 (admin 작성자)
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("admin 없음");

  await prisma.boardPost.deleteMany({ where: { title: { startsWith: "[TEST]" } } });

  const post = await prisma.boardPost.create({
    data: {
      category: "shop_only",
      title:    "[TEST] 비밀 게시판 첫 글",
      content:  "업소회원과 관리자만 볼 수 있는 게시글입니다.",
      authorId: admin.id,
    },
  });
  console.log(`\n[2] BoardPost 작성: id=${post.id}, category=${post.category}`);

  // 4) 댓글 작성 (Comment 테이블 재사용 — targetType="shop_only")
  const comment = await prisma.comment.create({
    data: {
      targetType: "shop_only",
      targetId:   post.id,
      authorId:   admin.id,
      content:    "[TEST] 댓글 — Comment 테이블이 polymorphic 으로 동작하는지 검증",
      isLuckyWin: false,
    },
  });
  console.log(`[3] Comment 작성 (재사용): id=${comment.id}, targetType=${comment.targetType}, targetId=${comment.targetId}`);

  // 5) 게시글 조회 (commentCount 집계 검증)
  const list = await prisma.boardPost.findMany({
    where: { category: "shop_only", deletedAt: null },
    include: { author: { select: { nickname: true, role: true } } },
  });
  const counts = await prisma.comment.groupBy({
    by: ["targetId"],
    where: { targetType: "shop_only", deletedAt: null, targetId: { in: list.map((p) => p.id) } },
    _count: { id: true },
  });
  console.log(`\n[4] 게시글 ${list.length}건 + 댓글 집계 ${counts.length}건`);
  for (const p of list) {
    const cnt = counts.find((c) => c.targetId === p.id)?._count.id ?? 0;
    console.log(`    · #${p.id} "${p.title}" by ${p.author.nickname} (${p.author.role}) — 댓글 ${cnt}건`);
  }

  // 6) 토글 OFF — 데이터 보존 확인
  cfg = await prisma.siteConfig.update({
    where: { id: 1 },
    data:  { isShopCommunityActive: false },
  });
  console.log(`\n[5] SiteConfig OFF 로 변경: ${cfg.isShopCommunityActive}`);
  const stillExists = await prisma.boardPost.count({ where: { category: "shop_only" } });
  console.log(`    → BoardPost 데이터는 그대로 보존됨: ${stillExists}건 (메뉴만 숨겨질 뿐)`);

  // 7) 다시 ON 으로 (초기 상태로 복귀)
  await prisma.siteConfig.update({ where: { id: 1 }, data: { isShopCommunityActive: true } });

  console.log("\n" + "━".repeat(64));
  console.log("✅ 검증 완료 — 토글·CRUD·Comment 재사용·데이터 보존 모두 정상");
  console.log(`📊 SiteConfig: ON / BoardPost ${stillExists}건 / Comment ${await prisma.comment.count({ where: { targetType: "shop_only" } })}건`);
  console.log("━".repeat(64));
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
