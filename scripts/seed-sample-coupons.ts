/**
 * 업소회원이 등록하는 쿠폰 2건 시드
 *   1. 강남 건마 — 첫 방문 50,000원 할인 (선착순 5명)
 *   2. 종로 오피 — 무료 음료 1잔 (무제한)
 *
 * 실행: npx tsx scripts/seed-sample-coupons.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, UserStatus } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { createCoupon, getCoupons, couponLabel } from "../src/lib/data";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function ensureShop(username: string, nickname: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing;
  return prisma.user.create({
    data: { username, nickname, passwordHash: "", role: UserRole.SHOP, status: UserStatus.ACTIVE,
            memo: "[샘플 시드] 데모용 업소회원" },
  });
}

async function main() {
  const shop = await ensureShop("_demo_shop", "강남최고업소");
  console.log(`업소회원 — id=${shop.id} ${shop.nickname} (${shop.username})\n`);

  // ── 1번 쿠폰 ──
  createCoupon({
    type: "coupon",
    title: "🎉 첫 방문 손님 50,000원 즉시 할인",
    description:
      "안녕하세요 강남최고업소입니다.\n\n" +
      "오픈 기념 첫 방문 손님께 5만원 즉시 할인 쿠폰을 드립니다.\n\n" +
      "▶ 사용 조건\n" +
      "  · 본 게시글의 [쿠폰 받기] 버튼으로 발급받은 분만\n" +
      "  · 매장 방문 시 닉네임 또는 예약 코드 제시\n" +
      "  · 다른 할인과 중복 적용 불가\n\n" +
      "▶ 영업시간\n" +
      "  · 매일 18:00 ~ 익일 04:00 (연중무휴)\n\n" +
      "▶ 위치\n" +
      "  · 서울 강남구 역삼동 (지하철 강남역 3번 출구 도보 5분)\n\n" +
      "선착순 5명, 빨리 받아가세요!",
    discount: couponLabel({ couponType: "DISCOUNT", discountAmount: 50000, discount: "" }),
    couponType: "DISCOUNT",
    discountAmount: 50000,
    shopId: null,
    shopName: "강남최고업소",
    validUntil: "2026-12-31",
    isActive: true,
    maxIssue: 5,
    ownerUserId: shop.id,
    area: "서울",
    bizType: "건마",
    photos: [],
    mainPhoto: "",
  });

  // ── 2번 쿠폰 ──
  createCoupon({
    type: "coupon",
    title: "☕ 방문 손님 전원 음료 1잔 무료",
    description:
      "종로 명소 우리 업소입니다.\n\n" +
      "오시는 모든 손님께 음료 1잔을 무료로 제공해 드립니다.\n" +
      "(아메리카노 / 오렌지주스 / 콜라 중 택 1)\n\n" +
      "▶ 발급 후 30일 이내 사용\n" +
      "▶ 인당 1매 한정\n" +
      "▶ 별도 예약 필요 없음 — 닉네임만 제시하시면 됩니다",
    discount: couponLabel({ couponType: "FREE", discount: "" }),
    couponType: "FREE",
    shopId: null,
    shopName: "종로 휴식공간",
    validUntil: "",
    isActive: true,
    maxIssue: 0,
    ownerUserId: shop.id,
    area: "서울",
    bizType: "오피",
    photos: [],
    mainPhoto: "",
  });

  console.log("✅ 2건 등록 완료\n");

  for (const c of getCoupons()) {
    console.log(`  [${c.id}] ${c.title}`);
    console.log(`       종류: ${couponLabel(c)}  |  지역: ${c.area} / 업종: ${c.bizType}`);
    console.log(`       선착순: ${c.maxIssue ? c.maxIssue + "명" : "무제한"}  |  유효기간: ${c.validUntil || "무기한"}`);
    console.log(`       소유: ownerUserId=${c.ownerUserId}\n`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
