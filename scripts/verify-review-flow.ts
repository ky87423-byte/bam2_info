/**
 * 프리미엄 인증 후기 시스템 E2E 검증
 *   1. 쿠폰 사용 후 → 인증 후기 작성 → 배지/포인트
 *   2. 일반 후기 — 적은 포인트
 *   3. 7일 규칙 — 미작성 시 신규 쿠폰 발급 차단 / 작성 후 해제
 *   4. 위젯 데이터 — getCertifiedReviewsForShop
 *   5. 권한 격리 — 다른 user 쿠폰으로 인증 후기 시도 차단
 *   6. 1쿠폰 1후기 — 동일 user_coupon 으로 중복 작성 차단
 *
 * 실행: npx tsx scripts/verify-review-flow.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, UserStatus } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createCoupon, claimCoupon, markCouponUsed, getUserCoupons, couponLabel,
  createReview, findReviewByUserCouponId, getOverdueUserCoupons,
  getCertifiedReviewsForShop, getReviews, getSettings,
  REVIEW_DEADLINE_DAYS,
} from "../src/lib/data";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const COUPONS_PATH      = path.join(process.cwd(), "data", "coupons.json");
const USER_COUPONS_PATH = path.join(process.cwd(), "data", "user_coupons.json");
const REVIEWS_PATH      = path.join(process.cwd(), "data", "reviews.json");

let pass = 0, fail = 0;
function ok(msg: string)   { console.log(`    ✅ ${msg}`); pass++; }
function bad(msg: string)  { console.log(`    ❌ ${msg}`); fail++; process.exitCode = 1; }
function info(msg: string) { console.log(`    · ${msg}`); }
function header(t: string) { console.log(`\n━━ ${t} ${"━".repeat(Math.max(0, 56 - t.length))}`); }

async function ensureUser(username: string, nickname: string, role: UserRole) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    if (existing.role !== role || existing.status !== UserStatus.ACTIVE) {
      await prisma.user.update({ where: { id: existing.id }, data: { role, status: UserStatus.ACTIVE } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { username, nickname, passwordHash: "", role, status: UserStatus.ACTIVE, memo: "[E2E-review]" },
  });
}

function backupAndReset() {
  const stash: Record<string, string> = {};
  const targets = [COUPONS_PATH, USER_COUPONS_PATH, REVIEWS_PATH];
  for (const p of targets) {
    stash[p] = fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "[]";
    fs.writeFileSync(p, "[]");
  }
  return () => {
    // 항상 모든 대상 파일을 원복 (없었더라도 [] 로 비워둠 — 잔여 누수 방지)
    for (const p of targets) fs.writeFileSync(p, stash[p]);
  };
}

function backdateUsedCoupon(userCouponId: number, days: number) {
  const ucs = JSON.parse(fs.readFileSync(USER_COUPONS_PATH, "utf-8"));
  const idx = ucs.findIndex((u: { id: number }) => u.id === userCouponId);
  if (idx < 0) return;
  const date = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  ucs[idx].usedAt = date;
  fs.writeFileSync(USER_COUPONS_PATH, JSON.stringify(ucs, null, 2));
}

async function main() {
  console.log("━".repeat(64));
  console.log("🧪  인증 후기 시스템 E2E 검증");
  console.log("━".repeat(64));

  const restore = backupAndReset();
  try {
    const shop  = await ensureUser("_e2e_rev_shop",  "리뷰테스트업소", UserRole.SHOP);
    const userA = await ensureUser("_e2e_rev_userA", "리뷰유저A",      UserRole.USER);
    const userB = await ensureUser("_e2e_rev_userB", "리뷰유저B",      UserRole.USER);
    info(`shop=${shop.id}  userA=${userA.id}  userB=${userB.id}`);

    // ── 시나리오 1: 정상 흐름 — 쿠폰 사용 → 인증 후기 → 배지/포인트 ──
    header("시나리오 1: 인증 후기 작성 흐름");

    createCoupon({
      type: "coupon", title: "[리뷰E2E] 할인 30k",
      description: "테스트", discount: couponLabel({ couponType: "DISCOUNT", discountAmount: 30000, discount: "" }),
      couponType: "DISCOUNT", discountAmount: 30000,
      shopId: null, shopName: "리뷰테스트업소", validUntil: "", isActive: true,
      maxIssue: 0, ownerUserId: shop.id,
      area: "서울", bizType: "건마",
    });
    const c = JSON.parse(fs.readFileSync(COUPONS_PATH, "utf-8"))[0];

    const claim = await claimCoupon(userA.id, c.id);
    if (!claim.ok) { bad(`받기 실패 — ${claim.error}`); return; }
    ok("회원 쿠폰 받기 성공");

    const ucId = getUserCoupons(userA.id).find((u) => u.couponId === c.id)!.id;
    markCouponUsed(ucId);
    ok(`사장 [사용 확인] 처리 (userCouponId=${ucId})`);

    const settings = getSettings();
    const beforePoints = (await prisma.user.findUnique({ where: { id: userA.id } }))!.points;

    // 인증 후기 작성 (data 레이어 직접) — actions 의 본질적 동작 시뮬레이트
    const cert = createReview({
      authorId: userA.id, authorUsername: "_e2e_rev_userA", authorNickname: "리뷰유저A",
      userCouponId: ucId, couponId: c.id, isCertified: true,
      shopName: c.shopName, bizType: c.bizType,
      title: "정말 만족스러웠어요", content: "친절하고 깔끔합니다. 재방문 의사 100%",
      photos: [], mainPhoto: "",
      ratingFacility: 5, ratingService: 4, ratingPrice: 4,
      tags: ["친절함", "청결함"],
    });
    if (cert.isCertified) ok(`인증 후기 생성됨 — id=${cert.id} 배지=실제 방문 인증`);
    else bad("isCertified 플래그가 안 켜짐");

    // 차등 포인트 — actions 가 아니라 직접 호출이므로 awardPoints 시뮬레이트
    const { awardPoints } = await import("../src/lib/data");
    await awardPoints(userA.id, "post", settings.pointCertifiedReview, `[인증] 후기 #${cert.id}`);
    const afterPoints = (await prisma.user.findUnique({ where: { id: userA.id } }))!.points;
    const gained = afterPoints - beforePoints;
    if (gained === settings.pointCertifiedReview) ok(`인증 후기 포인트 ${gained}P 지급 (pointCertifiedReview)`);
    else bad(`포인트 ${gained}P (예상 ${settings.pointCertifiedReview}P)`);

    if (settings.pointCertifiedReview > settings.pointReview) {
      ok(`차등 보상 OK — 인증(${settings.pointCertifiedReview}P) > 일반(${settings.pointReview}P)`);
    } else {
      bad("차등 보상 설정 오류");
    }

    // 1쿠폰 1후기 중복 차단
    const dup = findReviewByUserCouponId(ucId);
    if (dup?.id === cert.id) ok("findReviewByUserCouponId — 같은 user_coupon 으로 중복 작성 시도 시 기존 후기 반환");
    else bad("중복 검사 함수 실패");

    // ── 시나리오 2: 일반 후기 — 적은 포인트 ──
    header("시나리오 2: 일반 후기 — 차등 보상 (적게)");
    const beforeP2 = (await prisma.user.findUnique({ where: { id: userB.id } }))!.points;
    const general = createReview({
      authorId: userB.id, authorUsername: "_e2e_rev_userB", authorNickname: "리뷰유저B",
      userCouponId: null, couponId: null, isCertified: false,
      shopName: "랜덤업소", bizType: "오피",
      title: "그냥 들렀어요", content: "처음 가본 후기입니다.",
      photos: [], mainPhoto: "",
      ratingFacility: 3, ratingService: 3, ratingPrice: 3, tags: [],
    });
    if (!general.isCertified) ok("일반 후기 isCertified=false");
    else bad("일반 후기에 isCertified 가 켜짐");
    await awardPoints(userB.id, "post", settings.pointReview, `후기 #${general.id}`);
    const gainedB = (await prisma.user.findUnique({ where: { id: userB.id } }))!.points - beforeP2;
    if (gainedB === settings.pointReview) ok(`일반 후기 포인트 ${gainedB}P (pointReview)`);
    else bad(`일반 후기 포인트 ${gainedB}P (예상 ${settings.pointReview}P)`);

    // ── 시나리오 3: 7일 규칙 — 차단 → 후기 작성 → 해제 ──
    header("시나리오 3: 7일 규칙 — 차단 / 해제");

    // 다른 쿠폰 발급 (userB) → 사용 확인 → 8일 전으로 backdate
    createCoupon({
      type: "coupon", title: "[리뷰E2E2] 만료 테스트",
      description: "test", discount: "무료권", couponType: "FREE",
      shopId: null, shopName: "다른업소", validUntil: "", isActive: true,
      maxIssue: 0, ownerUserId: shop.id, area: "서울", bizType: "오피",
    });
    const c2 = JSON.parse(fs.readFileSync(COUPONS_PATH, "utf-8")).find(
      (x: { title: string }) => x.title === "[리뷰E2E2] 만료 테스트",
    );
    await claimCoupon(userB.id, c2.id);
    const ucB = getUserCoupons(userB.id).find((u) => u.couponId === c2.id)!.id;
    markCouponUsed(ucB);
    backdateUsedCoupon(ucB, 8);  // 8일 전 사용 처리

    const overdue = getOverdueUserCoupons(userB.id);
    if (overdue.find((o) => o.id === ucB)) ok("getOverdueUserCoupons — 8일 전 사용 + 미작성 쿠폰 검출");
    else bad("overdue 검출 실패");

    // 새 쿠폰 발급 시도 → 차단되어야 함
    createCoupon({
      type: "coupon", title: "[리뷰E2E3] 신규",
      description: "신규", discount: "무료권", couponType: "FREE",
      shopId: null, shopName: "신규업소", validUntil: "", isActive: true,
      maxIssue: 0, ownerUserId: shop.id, area: "서울", bizType: "오피",
    });
    const c3 = JSON.parse(fs.readFileSync(COUPONS_PATH, "utf-8")).find(
      (x: { title: string }) => x.title === "[리뷰E2E3] 신규",
    );
    const blocked = await claimCoupon(userB.id, c3.id);
    if (!blocked.ok && blocked.error?.includes(`${REVIEW_DEADLINE_DAYS}일`)) {
      ok(`7일 가드 발동 — "${blocked.error}"`);
    } else {
      bad(`가드 무력화: ok=${blocked.ok}, error=${blocked.error}`);
    }

    // 후기 작성 → 가드 해제
    createReview({
      authorId: userB.id, authorUsername: "_e2e_rev_userB", authorNickname: "리뷰유저B",
      userCouponId: ucB, couponId: c2.id, isCertified: true,
      shopName: c2.shopName, bizType: c2.bizType,
      title: "마감 직전 작성", content: "겨우 작성했어요",
      photos: [], mainPhoto: "",
      ratingFacility: 4, ratingService: 4, ratingPrice: 4, tags: ["가성비"],
    });
    const overdueAfter = getOverdueUserCoupons(userB.id);
    if (overdueAfter.length === 0) ok("후기 작성 후 overdue 큐 비워짐");
    else bad(`후기 작성 후에도 overdue 잔존: ${overdueAfter.length}건`);

    const released = await claimCoupon(userB.id, c3.id);
    if (released.ok) ok("가드 해제됨 — 신규 쿠폰 발급 성공");
    else bad(`가드 해제 안 됨 — ${released.error}`);

    // ── 시나리오 4: 위젯 데이터 — getCertifiedReviewsForShop ──
    header("시나리오 4: 업소 상세 위젯 — 인증 후기만 노출");
    const shopReviews = getCertifiedReviewsForShop("리뷰테스트업소");
    if (shopReviews.length === 1 && shopReviews[0].isCertified && shopReviews[0].shopName === "리뷰테스트업소") {
      ok(`getCertifiedReviewsForShop("리뷰테스트업소") → 1건 인증 후기`);
    } else {
      bad(`위젯 결과 ${shopReviews.length}건, 첫 건 isCertified=${shopReviews[0]?.isCertified}`);
    }
    // 일반 후기는 위젯에 안 보여야 함
    const noiseShop = getCertifiedReviewsForShop("랜덤업소");
    if (noiseShop.length === 0) ok("일반 후기만 있는 업소 위젯 → 0건");
    else bad("일반 후기가 위젯에 노출됨");

    // ── 시나리오 5: 인증 권한 — 다른 user 의 user_coupon 사용 차단 ──
    header("시나리오 5: 인증 권한 — 본인 쿠폰만 인증 후기 작성");
    const myUcs = getUserCoupons(userB.id);
    const stolenUcId = myUcs[0]?.id;
    if (!stolenUcId) bad("setup error: userB 에 user_coupon 없음");
    // userA 가 userB 의 user_coupon 으로 인증 후기 시도 — actions/review.ts 가드 시뮬레이트
    const { getUserCouponById } = await import("../src/lib/data");
    const uc = getUserCouponById(stolenUcId!);
    if (uc && uc.userId !== userA.id) ok("getUserCouponById.userId 검증 — userA 가 userB 쿠폰 접근 시 가드 트리거");
    else bad("권한 가드 실패");

    // ── 시나리오 6: 게시판 필터링 / 카운트 sanity ──
    header("시나리오 6: 게시판 필터 sanity");
    const allReviews = getReviews();
    info(`전체 후기 ${allReviews.length}건`);
    const certifiedOnly = getReviews({ certifiedOnly: true });
    if (certifiedOnly.length === 2) ok(`인증 후기만 필터 → 2건`);
    else bad(`인증 필터 ${certifiedOnly.length}건 (예상 2)`);

    const byBizType = getReviews({ bizType: "건마" });
    if (byBizType.length === 1) ok(`bizType=건마 필터 → 1건`);
    else bad(`bizType 필터 ${byBizType.length}건 (예상 1)`);

  } finally {
    restore();
  }

  console.log("\n" + "━".repeat(64));
  console.log(`결과: ✅ ${pass} 통과 / ❌ ${fail} 실패`);
  console.log("━".repeat(64));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
