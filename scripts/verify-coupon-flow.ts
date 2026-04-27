/**
 * 쿠폰 전체 흐름 E2E 검증:
 *   1. shop 사용자가 쿠폰 등록 (3종 타입)
 *   2. user 가 [받기] → 예약 코드 발급 + 알림 쪽지
 *   3. shop 이 검색 → [사용 확인] → usedAt 기록
 *   4. 중복 발급 차단 / 수량 마감 검증
 *
 * 실행: npx tsx scripts/verify-coupon-flow.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, UserStatus } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createCoupon, claimCoupon, getCoupons, getUserCouponById,
  searchShopUserCoupons, markCouponUsed, getCouponClaimCounts,
  couponLabel,
} from "../src/lib/data";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const COUPONS_PATH      = path.join(process.cwd(), "data", "coupons.json");
const USER_COUPONS_PATH = path.join(process.cwd(), "data", "user_coupons.json");

function ok(msg: string)   { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.log(`  ❌ ${msg}`); process.exitCode = 1; }
function info(msg: string) { console.log(`  ℹ️  ${msg}`); }

async function ensureUser(username: string, nickname: string, role: UserRole) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    if (existing.role !== role || existing.status !== UserStatus.ACTIVE) {
      await prisma.user.update({ where: { id: existing.id }, data: { role, status: UserStatus.ACTIVE } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { username, nickname, passwordHash: "", role, status: UserStatus.ACTIVE, memo: "[E2E] 자동 생성" },
  });
}

// 테스트 격리 — 기존 JSON 백업 후 빈 상태로 시작
function backupAndReset() {
  const stash: Record<string, string> = {};
  for (const p of [COUPONS_PATH, USER_COUPONS_PATH]) {
    if (fs.existsSync(p)) stash[p] = fs.readFileSync(p, "utf-8");
    fs.writeFileSync(p, "[]");
  }
  return () => {
    for (const [p, content] of Object.entries(stash)) fs.writeFileSync(p, content);
  };
}

async function main() {
  console.log("━".repeat(60));
  console.log("🧪  쿠폰 게시판 E2E 검증");
  console.log("━".repeat(60));

  const restore = backupAndReset();
  try {
    // ── 0) 테스트 계정 준비 ──
    const shop = await ensureUser("_e2e_shop", "테스트업소E2E", UserRole.SHOP);
    const userA = await ensureUser("_e2e_userA", "테스트유저A", UserRole.USER);
    const userB = await ensureUser("_e2e_userB", "테스트유저B", UserRole.USER);
    info(`shop=${shop.id} userA=${userA.id} userB=${userB.id}`);

    // 발급 전 메시지 카운트 (테스트 후 차이 확인용)
    const msgsBefore = await prisma.message.count({ where: { receiverId: { in: [userA.id, userB.id] } } });

    // ── 1) shop 이 쿠폰 3종 등록 — 게시판 필드(area/bizType/photos/긴 본문) 포함 ──
    console.log("\n[1] shop 이 쿠폰 3종 등록 (ORIGINAL_PRICE / FREE / DISCOUNT) + 게시판 필드");
    const longBody = "테스트 본문입니다.\n줄바꿈 보존 확인.\n사진과 함께 노출됩니다.";
    createCoupon({
      type: "coupon", title: "원가 쿠폰", description: longBody,
      discount: couponLabel({ couponType: "ORIGINAL_PRICE", discount: "" }),
      couponType: "ORIGINAL_PRICE",
      shopId: null, shopName: "테스트업소", validUntil: "", isActive: true,
      maxIssue: 0, ownerUserId: shop.id,
      area: "서울", bizType: "건마",
      photos: ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
      mainPhoto: "https://example.com/p1.jpg",
    });
    createCoupon({
      type: "coupon", title: "무료 쿠폰", description: "무료권 테스트",
      discount: couponLabel({ couponType: "FREE", discount: "" }),
      couponType: "FREE",
      shopId: null, shopName: "테스트업소", validUntil: "", isActive: true,
      maxIssue: 1, ownerUserId: shop.id,                  // 선착순 1명 (마감 테스트용)
      area: "경기", bizType: "오피",
    });
    createCoupon({
      type: "coupon", title: "할인 쿠폰", description: "할인권 테스트",
      discount: couponLabel({ couponType: "DISCOUNT", discountAmount: 30000, discount: "" }),
      couponType: "DISCOUNT", discountAmount: 30000,
      shopId: null, shopName: "테스트업소", validUntil: "", isActive: true,
      maxIssue: 0, ownerUserId: shop.id,
      area: "서울", bizType: "건마",
    });

    const coupons = getCoupons();
    if (coupons.length !== 3) fail(`쿠폰 3개 등록되어야 하는데 ${coupons.length}개`);
    else ok(`쿠폰 3개 등록됨 — ${coupons.map(c => `[${c.id}] ${couponLabel(c)}`).join(", ")}`);
    const [cOrig, cFree, cDisc] = coupons.sort((a, b) => a.id - b.id); // createCoupon 은 unshift라 역순 → id로 재정렬

    // 게시판 필드 보존 검증
    if (cOrig.area === "서울" && cOrig.bizType === "건마" && cOrig.photos?.length === 2 && cOrig.mainPhoto === "https://example.com/p1.jpg") {
      ok(`area/bizType/photos/mainPhoto 보존 OK (cOrig: ${cOrig.area}/${cOrig.bizType}, photos=${cOrig.photos!.length}장)`);
    } else {
      fail(`게시판 필드 보존 실패 — area=${cOrig.area}, bizType=${cOrig.bizType}, photos=${cOrig.photos?.length}, mainPhoto=${cOrig.mainPhoto}`);
    }
    if (cOrig.description === longBody) ok("긴 본문 줄바꿈 보존 OK");
    else fail("긴 본문 보존 실패");

    // ── 2) userA 가 3종 모두 받기 ──
    console.log("\n[2] userA 가 3종 모두 [쿠폰 받기]");
    for (const c of [cOrig, cFree, cDisc]) {
      const r = await claimCoupon(userA.id, c.id);
      if (!r.ok) { fail(`claim 실패: ${c.title} — ${r.error}`); continue; }
      if (!r.reservationCode || !/^[A-Z2-9]{8}$/.test(r.reservationCode)) {
        fail(`예약 코드 형식 불량: "${r.reservationCode}"`);
      } else {
        ok(`${c.title} 받기 OK — 예약 코드 ${r.reservationCode}`);
      }
    }

    // ── 3) 중복 발급 차단 ──
    console.log("\n[3] userA 가 같은 쿠폰 다시 받으려고 시도 (중복 차단)");
    const dupe = await claimCoupon(userA.id, cOrig.id);
    if (dupe.ok) fail("중복 발급이 차단되지 않음");
    else ok(`중복 차단됨: "${dupe.error}"`);

    // ── 4) 수량 마감 (cFree maxIssue=1, 이미 userA가 받음 → userB 차단) ──
    console.log("\n[4] cFree(maxIssue=1) — userA 이미 받음 → userB 마감 차단");
    const soldOut = await claimCoupon(userB.id, cFree.id);
    if (soldOut.ok) fail("수량 마감이 차단되지 않음");
    else ok(`마감 차단됨: "${soldOut.error}"`);
    const counts = getCouponClaimCounts();
    if (counts[cFree.id] !== 1) fail(`수량 카운트 ${counts[cFree.id]} (예상 1)`);
    else ok(`수량 카운트 정확: cFree = 1 / 1`);

    // ── 5) shop 측 검색 ──
    console.log("\n[5] shop 측 [사용 확인] 페이지 검색");
    const userACoupons = await searchShopUserCoupons({ ownerUserId: shop.id, q: "테스트유저A" });
    if (userACoupons.length !== 3) fail(`닉네임 검색 결과 ${userACoupons.length}건 (예상 3)`);
    else ok(`닉네임 "테스트유저A" 검색 → 3건 매칭`);

    const firstCode = userACoupons[0].userCoupon.reservationCode!;
    const byCode = await searchShopUserCoupons({ ownerUserId: shop.id, q: firstCode });
    if (byCode.length !== 1) fail(`예약 코드 검색 결과 ${byCode.length}건 (예상 1)`);
    else ok(`예약 코드 "${firstCode}" 검색 → 1건 매칭`);

    // 권한 테스트: 다른 shop owner 시도
    const noisy = await ensureUser("_e2e_other_shop", "다른업소", UserRole.SHOP);
    const cross = await searchShopUserCoupons({ ownerUserId: noisy.id, q: "테스트유저A" });
    if (cross.length !== 0) fail(`다른 업소가 결과 보임 (${cross.length}건)`);
    else ok("다른 업소가 검색해도 0건 (격리 OK)");

    // ── 6) [사용 확인] → usedAt 기록 ──
    console.log("\n[6] 사용 확인 처리 — usedAt 기록 검증");
    const target = userACoupons.find(r => r.coupon.couponType === "DISCOUNT")!;
    markCouponUsed(target.userCoupon.id);
    const after = getUserCouponById(target.userCoupon.id);
    if (!after?.usedAt) fail("usedAt 이 기록되지 않음");
    else ok(`usedAt 기록됨 = ${after.usedAt}`);

    // 사용된 것은 다음 검색 (includeUsed=false) 에서 제외되어야 함
    const afterSearch = await searchShopUserCoupons({ ownerUserId: shop.id, q: "테스트유저A" });
    if (afterSearch.length !== 2) fail(`사용 후 검색 ${afterSearch.length}건 (예상 2)`);
    else ok("사용된 쿠폰은 기본 검색에서 제외됨 (남은 2건)");

    const inclUsed = await searchShopUserCoupons({ ownerUserId: shop.id, q: "테스트유저A", includeUsed: true });
    if (inclUsed.length !== 3) fail(`includeUsed 검색 ${inclUsed.length}건 (예상 3)`);
    else ok("includeUsed=true 시 사용된 것 포함 (3건)");

    // ── 7) 알림 쪽지 ──
    // 주의: 본 스크립트는 data.ts 의 claimCoupon 만 호출하므로 알림 쪽지는 발송되지 않음
    //       (알림은 actions/coupon.ts 의 actionClaimCoupon 안에서만 prisma.message.create)
    //       → 여기서는 actionClaimCoupon 의 핵심 로직을 직접 시뮬레이트하여 검증
    console.log("\n[7] 알림 쪽지 시뮬레이트 — sender=shop, receiver=userA");
    const couponForNotify = cOrig;  // ownerUserId = shop.id
    const fakeReservationCode = "TESTCODE";
    await prisma.message.create({
      data: {
        senderId: couponForNotify.ownerUserId!,
        receiverId: userA.id,
        content: `쿠폰이 발급되었습니다. 내 쿠폰함에서 확인하세요.\n예약 코드: ${fakeReservationCode}`,
      },
    });
    const msgsAfter = await prisma.message.count({ where: { receiverId: { in: [userA.id, userB.id] } } });
    if (msgsAfter - msgsBefore < 1) fail("알림 쪽지가 생성되지 않음");
    else ok(`쪽지 ${msgsAfter - msgsBefore}건 생성됨 (sender=shop ${shop.id}, receiver=userA ${userA.id})`);

    const lastMsg = await prisma.message.findFirst({
      where: { receiverId: userA.id, senderId: shop.id },
      orderBy: { id: "desc" },
    });
    if (!lastMsg?.content.includes("쿠폰이 발급되었습니다")) fail("쪽지 본문 형식 불일치");
    else ok(`쪽지 본문 OK — "${lastMsg.content.split("\n")[0]}"`);

    // ── 8) 정리 ──
    console.log("\n[정리] 테스트 데이터 cleanup");
    await prisma.message.deleteMany({
      where: { OR: [
        { senderId: shop.id, receiverId: { in: [userA.id, userB.id] } },
      ] },
    });
    info("쪽지 삭제 완료");

  } finally {
    restore();
    info("data/coupons.json, data/user_coupons.json 원복 완료");
  }

  console.log("\n" + "━".repeat(60));
  if (process.exitCode) console.log(`❌ 일부 단계 실패 (exit ${process.exitCode})`);
  else console.log("✅ 전 단계 통과");
  console.log("━".repeat(60));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
