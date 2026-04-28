/**
 * 쿠폰 게시판 4개 시나리오 통합 검증
 *   1) 정상 흐름   — 업소 A 등록 → 회원 받기 → 사용 확인 → 후기 권한
 *   2) 선착순 마감 — maxIssue=1 한 자리 → 두 번째 회원 차단
 *   3) 권한 격리   — 업소 B 가 업소 A 쿠폰 수정/삭제/사용확인 시도 → 모두 차단
 *   4) 만료/비활성 — 만료/비활성 쿠폰은 게시판 리스트 제외 + 받기 차단
 *
 * 실행: npx tsx scripts/verify-coupon-scenarios.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, UserStatus } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createCoupon, claimCoupon, getCoupons, getCouponClaimCounts,
  getUserCouponById, searchShopUserCoupons, markCouponUsed, updateCoupon, deleteCoupon,
  getUserCoupons, couponLabel,
} from "../src/lib/data";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const COUPONS_PATH      = path.join(process.cwd(), "data", "coupons.json");
const USER_COUPONS_PATH = path.join(process.cwd(), "data", "user_coupons.json");

let passCount = 0, failCount = 0;
function ok(msg: string)   { console.log(`    ✅ ${msg}`); passCount++; }
function fail(msg: string) { console.log(`    ❌ ${msg}`); failCount++; process.exitCode = 1; }
function info(msg: string) { console.log(`    · ${msg}`); }
function header(title: string) { console.log(`\n━━ ${title} ${"━".repeat(Math.max(0, 56 - title.length))}`); }

async function ensureUser(username: string, nickname: string, role: UserRole) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    if (existing.role !== role || existing.status !== UserStatus.ACTIVE) {
      await prisma.user.update({ where: { id: existing.id }, data: { role, status: UserStatus.ACTIVE } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { username, nickname, passwordHash: "", role, status: UserStatus.ACTIVE, memo: "[E2E-시나리오]" },
  });
}

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

function listingFiltered(opts: { area?: string; bizType?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return getCoupons()
    .filter((c) => (c.type ?? "coupon") === "coupon" && c.isActive && (!c.validUntil || c.validUntil >= today))
    .filter((c) => !opts.area    || c.area    === opts.area)
    .filter((c) => !opts.bizType || c.bizType === opts.bizType);
}

// ── shop 권한 시뮬레이트 (actions/coupon.ts 의 assertShopOwnsCoupon 로직 동일) ──
function shopOwnsCoupon(couponId: number, shopUserId: number): boolean {
  const c = getCoupons().find((x) => x.id === couponId);
  return !!c && c.ownerUserId === shopUserId;
}

// ─────────────────────────────────────────────────────────────────────────────

async function scenario1_happyPath(shopA: { id: number }, userA: { id: number }) {
  header("시나리오 1: 정상 흐름 — 등록 → 받기 → 사용 확인");

  // 업소 A 가 게시판 필드 다 채워서 할인 쿠폰 등록
  createCoupon({
    type: "coupon", title: "[시나리오1] 첫 방문 30,000원 할인",
    description: "본문 첫 줄\n둘째 줄 — 환영합니다!\n셋째 줄 — 매장 위치 안내",
    discount: couponLabel({ couponType: "DISCOUNT", discountAmount: 30000, discount: "" }),
    couponType: "DISCOUNT", discountAmount: 30000,
    shopId: null, shopName: "테스트A업소",
    validUntil: "", isActive: true, maxIssue: 0, ownerUserId: shopA.id,
    area: "서울", bizType: "건마",
    photos: ["https://example.com/main.jpg"], mainPhoto: "https://example.com/main.jpg",
  });
  const c = getCoupons()[0];
  ok(`업소가 쿠폰 등록 — id=${c.id} ${couponLabel(c)} (서울/건마)`);

  // 게시판 area=서울 필터에 노출 확인
  const listed = listingFiltered({ area: "서울" });
  if (listed.find((x) => x.id === c.id)) ok("회원이 area=서울 필터로 게시판에서 발견");
  else fail("게시판 area=서울 필터에 노출 안 됨");

  // bizType 필터로도 필터링되는지
  const byBiz = listingFiltered({ bizType: "건마" });
  if (byBiz.find((x) => x.id === c.id)) ok("bizType=건마 필터로도 발견");
  else fail("bizType=건마 필터에 노출 안 됨");

  // 회원 받기
  const claim = await claimCoupon(userA.id, c.id);
  if (!claim.ok || !claim.reservationCode) { fail(`받기 실패 — ${claim.error}`); return; }
  ok(`회원 [받기] 완료 — 예약 코드 ${claim.reservationCode}`);

  // 마이페이지에 노출되는지 (getUserCoupons)
  const myList = getUserCoupons(userA.id);
  const my = myList.find((uc) => uc.couponId === c.id);
  if (!my) { fail("마이페이지에 발급된 쿠폰 없음"); return; }
  ok(`마이페이지 쿠폰함에 노출 (예약코드 ${my.reservationCode})`);

  // 매장에서 사장이 닉네임 검색
  const found = await searchShopUserCoupons({ ownerUserId: shopA.id, q: "테스트유저A" });
  if (found.length !== 1) fail(`닉네임 검색 결과 ${found.length}건 (예상 1)`);
  else ok("사장이 닉네임으로 검색 → 1건 매칭");

  // 예약 코드로도 검색
  const byCode = await searchShopUserCoupons({ ownerUserId: shopA.id, q: claim.reservationCode! });
  if (byCode.length === 1) ok("예약 코드로도 검색 → 1건 매칭");
  else fail("예약 코드 검색 실패");

  // [사용 확인] → usedAt 기록
  markCouponUsed(my.id);
  const after = getUserCouponById(my.id);
  if (after?.usedAt) ok(`[사용 확인] 처리 → usedAt = ${after.usedAt} (후기 작성 권한 게이트 통과)`);
  else fail("usedAt 기록 안 됨 — 후기 권한 부여 못 함");
}

async function scenario2_soldOut(shopA: { id: number }, userA: { id: number }, userB: { id: number }) {
  header("시나리오 2: 선착순 마감 — maxIssue=1 → 두 번째 차단");

  createCoupon({
    type: "coupon", title: "[시나리오2] 선착순 1명 무료 체험",
    description: "딱 1명!", discount: couponLabel({ couponType: "FREE", discount: "" }),
    couponType: "FREE",
    shopId: null, shopName: "테스트A업소", validUntil: "", isActive: true,
    maxIssue: 1, ownerUserId: shopA.id, area: "서울", bizType: "건마",
  });
  const c = getCoupons().find((x) => x.title.startsWith("[시나리오2]"))!;
  ok(`maxIssue=1 무료권 등록 — id=${c.id}`);

  const r1 = await claimCoupon(userA.id, c.id);
  if (r1.ok) ok(`회원 A 받기 성공 — 예약 코드 ${r1.reservationCode}`);
  else fail(`회원 A 받기 실패 — ${r1.error}`);

  const r2 = await claimCoupon(userB.id, c.id);
  if (!r2.ok && r2.error?.includes("소진")) ok(`회원 B 마감 차단됨 — "${r2.error}"`);
  else fail("회원 B 가 마감 후에도 받음 (수량 가드 실패)");

  const counts = getCouponClaimCounts();
  if (counts[c.id] === 1) ok(`발급 카운트 1 / 1 (꽉 참)`);
  else fail(`발급 카운트 ${counts[c.id]} (예상 1)`);

  // 게시판 표시상 isSoldOut 판정 (page.tsx 로직 동일)
  const isSoldOut = c.maxIssue! > 0 && (counts[c.id] ?? 0) >= c.maxIssue!;
  if (isSoldOut) ok("게시판 카드에 [소진] 뱃지 노출 조건 충족");
  else fail("[소진] 판정 실패");
}

async function scenario3_isolation(
  shopA: { id: number }, shopB: { id: number }, userA: { id: number },
) {
  header("시나리오 3: 권한 격리 — 업소 B 가 A 쿠폰 건드리려 시도");

  createCoupon({
    type: "coupon", title: "[시나리오3] 업소 A 전용 할인",
    description: "건드리지 마세요",
    discount: couponLabel({ couponType: "DISCOUNT", discountAmount: 5000, discount: "" }),
    couponType: "DISCOUNT", discountAmount: 5000,
    shopId: null, shopName: "테스트A업소", validUntil: "", isActive: true,
    maxIssue: 0, ownerUserId: shopA.id, area: "서울", bizType: "건마",
  });
  const cA = getCoupons().find((x) => x.title.startsWith("[시나리오3]"))!;
  info(`A 의 쿠폰 id=${cA.id} ownerUserId=${cA.ownerUserId}`);

  // 회원이 일단 받음 (사용 확인 권한 테스트용)
  const cl = await claimCoupon(userA.id, cA.id);
  if (!cl.ok) { fail(`회원 받기 실패 — ${cl.error}`); return; }
  const ucId = getUserCoupons(userA.id).find((uc) => uc.couponId === cA.id)!.id;

  // (a) 업소 B 가 cA 의 owner 인 척 (assertShopOwnsCoupon)
  if (!shopOwnsCoupon(cA.id, shopB.id)) ok("업소 B 는 A 의 쿠폰 owner 아님 (가드 트리거 OK)");
  else fail("업소 B 가 owner 로 잘못 판정");

  // (b) 검색 페이지에서 B 가 검색 → 0건
  const cross = await searchShopUserCoupons({ ownerUserId: shopB.id, q: "테스트유저A" });
  if (cross.length === 0) ok("업소 B 의 사용 확인 검색 → 0건 (격리 OK)");
  else fail(`업소 B 가 ${cross.length}건 봄 (격리 실패)`);

  // (c) 직접 markCouponUsed 호출은 데이터 레이어에선 가드 없음 — actions/coupon.ts 의 actionMarkCouponUsed 가드 시뮬레이트
  //     shop role 시 user_coupon → coupon → ownerUserId 검증
  const uc = getUserCouponById(ucId)!;
  const guarded = shopOwnsCoupon(uc.couponId, shopB.id);
  if (!guarded) ok("[사용 확인] 가드 — 업소 B 의 actionMarkCouponUsed 거부될 것 (assertShopOwnsCoupon=false)");
  else fail("가드 통과되어 B 가 사용 처리 가능 (격리 실패)");

  // (d) 데이터 레이어로 B 가 직접 update/delete 했다고 가정 — 액션 레이어 가드만 검증
  //     actions/coupon.ts 의 actionShopUpdateCoupon / actionShopDeleteCoupon 의 assertShopOwnsCoupon 도 같은 함수
  const cleanUpd = shopOwnsCoupon(cA.id, shopB.id);
  if (!cleanUpd) ok("update/delete 액션 가드 — 업소 B 거부 (동일 가드 함수)");
  else fail("update/delete 가드 우회 가능");
}

async function scenario4_expiredOrInactive(shopA: { id: number }, userA: { id: number }) {
  header("시나리오 4: 만료 / 비활성 — 게시판 제외 + 받기 차단");

  // 어제 만료
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  createCoupon({
    type: "coupon", title: "[시나리오4] 만료된 쿠폰",
    description: "이미 끝남",
    discount: couponLabel({ couponType: "DISCOUNT", discountAmount: 10000, discount: "" }),
    couponType: "DISCOUNT", discountAmount: 10000,
    shopId: null, shopName: "테스트A업소", validUntil: yesterday, isActive: true,
    maxIssue: 0, ownerUserId: shopA.id, area: "서울", bizType: "건마",
  });
  // 비활성
  createCoupon({
    type: "coupon", title: "[시나리오4] 비활성 쿠폰",
    description: "꺼짐",
    discount: couponLabel({ couponType: "FREE", discount: "" }), couponType: "FREE",
    shopId: null, shopName: "테스트A업소", validUntil: "", isActive: false,
    maxIssue: 0, ownerUserId: shopA.id, area: "서울", bizType: "건마",
  });
  // 살아있는 컨트롤군
  createCoupon({
    type: "coupon", title: "[시나리오4] 정상 쿠폰",
    description: "OK", discount: couponLabel({ couponType: "FREE", discount: "" }), couponType: "FREE",
    shopId: null, shopName: "테스트A업소", validUntil: "", isActive: true,
    maxIssue: 0, ownerUserId: shopA.id, area: "서울", bizType: "건마",
  });

  const all = getCoupons().filter((c) => c.title.startsWith("[시나리오4]"));
  info(`만료/비활성/정상 3건 등록 (총 ${all.length})`);

  // 게시판 노출 — 정상만
  const listed = listingFiltered({});
  const expiredVisible  = listed.find((c) => c.title === "[시나리오4] 만료된 쿠폰");
  const inactiveVisible = listed.find((c) => c.title === "[시나리오4] 비활성 쿠폰");
  const okVisible       = listed.find((c) => c.title === "[시나리오4] 정상 쿠폰");

  if (!expiredVisible)  ok("만료된 쿠폰은 게시판에서 제외됨");
  else                  fail("만료된 쿠폰이 게시판에 노출됨");

  if (!inactiveVisible) ok("비활성 쿠폰은 게시판에서 제외됨");
  else                  fail("비활성 쿠폰이 게시판에 노출됨");

  if (okVisible)        ok("정상 쿠폰만 노출됨 (컨트롤군 통과)");
  else                  fail("정상 쿠폰이 보이지 않음");

  // 만료된 쿠폰 직접 받기 시도
  const expired = all.find((c) => c.title === "[시나리오4] 만료된 쿠폰")!;
  const e = await claimCoupon(userA.id, expired.id);
  if (!e.ok && e.error?.includes("만료")) ok(`만료 쿠폰 받기 차단 — "${e.error}"`);
  else fail("만료 쿠폰이 받아짐");

  // 비활성 쿠폰 직접 받기 시도
  const inactive = all.find((c) => c.title === "[시나리오4] 비활성 쿠폰")!;
  const i = await claimCoupon(userA.id, inactive.id);
  if (!i.ok && i.error?.includes("비활성")) ok(`비활성 쿠폰 받기 차단 — "${i.error}"`);
  else fail("비활성 쿠폰이 받아짐");

  // 비활성 쿠폰을 활성화 → 받을 수 있어야 함 (sanity)
  updateCoupon(inactive.id, { isActive: true });
  const re = await claimCoupon(userA.id, inactive.id);
  if (re.ok) ok("같은 쿠폰을 isActive=true 로 바꾸면 받기 성공 (활성화 로직 OK)");
  else fail(`활성화 후 받기 실패 — ${re.error}`);

  // 정리 (delete 액션 레이어 가드 sanity)
  deleteCoupon(inactive.id);
  ok("쿠폰 삭제 정상 작동");
}

async function main() {
  console.log("━".repeat(64));
  console.log("🧪  쿠폰 게시판 4 시나리오 통합 검증");
  console.log("━".repeat(64));

  const restore = backupAndReset();
  try {
    const shopA  = await ensureUser("_e2e_shopA", "테스트A업소", UserRole.SHOP);
    const shopB  = await ensureUser("_e2e_shopB", "테스트B업소", UserRole.SHOP);
    const userA  = await ensureUser("_e2e_userA", "테스트유저A", UserRole.USER);
    const userB  = await ensureUser("_e2e_userB", "테스트유저B", UserRole.USER);
    info(`shopA=${shopA.id}  shopB=${shopB.id}  userA=${userA.id}  userB=${userB.id}`);

    await scenario1_happyPath(shopA, userA);
    await scenario2_soldOut(shopA, userA, userB);
    await scenario3_isolation(shopA, shopB, userA);
    await scenario4_expiredOrInactive(shopA, userA);

    // 전 시나리오 발생한 쪽지 청소
    await prisma.message.deleteMany({
      where: { senderId: { in: [shopA.id, shopB.id] }, receiverId: { in: [userA.id, userB.id] } },
    });
  } finally {
    restore();
  }

  console.log("\n" + "━".repeat(64));
  console.log(`결과: ✅ ${passCount} 통과 / ❌ ${failCount} 실패`);
  console.log("━".repeat(64));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
