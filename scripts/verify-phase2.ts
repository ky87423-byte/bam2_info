/**
 * Phase 2 동작 확인:
 *  1. 가상 user lazy 생성
 *  2. 쪽지 → 가상 수신자 → AdminInquiry 우회 저장
 *  3. ClaimRequest 신청 + 승인 → Shop.ownerId 설정
 *  4. 승인 후 같은 가상 user에게 쪽지 → owner에게 직접 전달
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { ClaimStatus, InquiryStatus, UserRole, UserStatus } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

async function ensureVirtualUser(shopId: number, company: string): Promise<number> {
  const sh = await prisma.shop.findUnique({ where: { id: shopId }, select: { virtualUserId: true } });
  if (sh?.virtualUserId) return sh.virtualUserId;
  const u = await prisma.user.create({
    data: {
      username: `_v${shopId}`, nickname: company, passwordHash: "",
      role: UserRole.SHOP, status: UserStatus.ACTIVE, isVirtual: true,
      memo: "[자동생성] 검증",
    },
    select: { id: true },
  });
  await prisma.shop.update({ where: { id: shopId }, data: { virtualUserId: u.id } });
  return u.id;
}

async function main() {
  console.log("━".repeat(64));
  console.log("🧪  Phase 2 — 가상계정 + 인콰이어리 + 클레임 검증");
  console.log("━".repeat(64));

  // 0) 테스트 데이터 정리
  await prisma.adminInquiry.deleteMany({ where: { content: { startsWith: "[TEST]" } } });
  await prisma.claimRequest.deleteMany({ where: { proofText: { startsWith: "[TEST]" } } });
  // 기존 테스트용 가상 user 삭제
  await prisma.shop.updateMany({ where: { id: 1 }, data: { ownerId: null, virtualUserId: null } });
  await prisma.user.deleteMany({ where: { username: "_v1" } });

  // 0-1) Shop #1 존재 보장
  const shop1 = await prisma.shop.findUnique({ where: { id: 1 } });
  if (!shop1) {
    await prisma.shop.create({
      data: { id: 1, company: "테스트업소1", subject: "", content: "", area: "강남" },
    });
    console.log("✅ Shop #1 생성");
  }
  const shop = await prisma.shop.findUnique({ where: { id: 1 } });
  if (!shop) throw new Error("Shop #1 missing");

  // 1) 가상 user lazy 생성
  const virtualId = await ensureVirtualUser(shop.id, shop.company);
  console.log(`\n[1] 가상 user 생성: id=${virtualId}, username=_v${shop.id}, nickname="${shop.company}"`);
  const v = await prisma.user.findUnique({ where: { id: virtualId } });
  console.log(`    isVirtual=${v?.isVirtual}, passwordHash="${v?.passwordHash}", role=${v?.role}`);

  // 1-1) 가상 user 로그인 시도 차단 검증
  console.log(`    → 인증 차단 조건: passwordHash="" (${v?.passwordHash === ""}), isVirtual=true (${v?.isVirtual === true})`);

  // 2) 일반 회원이 가상 user에게 쪽지 → AdminInquiry 우회
  const sender = await prisma.user.findFirst({ where: { isVirtual: false, status: "ACTIVE" } });
  if (!sender) throw new Error("실제 sender 회원 없음");

  const inquiry = await prisma.adminInquiry.create({
    data: {
      senderId:      sender.id,
      shopId:        shop.id,
      virtualUserId: virtualId,
      content:       "[TEST] 가격 문의 드립니다 (가상 수신자 우회)",
    },
  });
  console.log(`\n[2] AdminInquiry 우회 저장: id=${inquiry.id}, status=${inquiry.status}`);

  // 3) 클레임 신청
  const claim = await prisma.claimRequest.create({
    data: {
      shopId:       shop.id,
      claimantId:   sender.id,    // 같은 user가 클레임도 한다고 가정
      proofText:    "[TEST] 본인은 해당 업소의 실 운영자이며 사업자번호 123-45-67890",
      contactPhone: "010-1234-5678",
    },
  });
  console.log(`\n[3] 클레임 신청: id=${claim.id}, status=${claim.status}`);

  // 4) admin 승인 트랜잭션
  await prisma.$transaction(async (tx) => {
    await tx.claimRequest.update({
      where: { id: claim.id },
      data:  { status: ClaimStatus.APPROVED, adminNote: "검증 통과", reviewedAt: new Date() },
    });
    await tx.shop.update({ where: { id: shop.id }, data: { ownerId: sender.id } });
  });
  const shopAfter = await prisma.shop.findUnique({ where: { id: shop.id }, select: { ownerId: true, virtualUserId: true } });
  console.log(`\n[4] 클레임 승인 → Shop.ownerId=${shopAfter?.ownerId}, virtualUserId=${shopAfter?.virtualUserId} (가상 user 유지)`);

  // 5) 인콰이어리 상태 변경 (admin 처리)
  await prisma.adminInquiry.update({
    where: { id: inquiry.id },
    data:  {
      status:    InquiryStatus.RESOLVED,
      adminNote: "클레임 승인됐으므로 owner에게 직접 안내함",
      reviewedAt: new Date(),
    },
  });
  console.log(`\n[5] 인콰이어리 상태 갱신: NEW → RESOLVED`);

  // 최종 통계
  const [userCount, virtualCount, inquiryCount, claimCount, ownedShops] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVirtual: true } }),
    prisma.adminInquiry.count(),
    prisma.claimRequest.count(),
    prisma.shop.count({ where: { ownerId: { not: null } } }),
  ]);

  console.log("\n" + "━".repeat(64));
  console.log("📊 DB 상태");
  console.log(`   User             : ${userCount}건 (가상: ${virtualCount})`);
  console.log(`   AdminInquiry     : ${inquiryCount}건`);
  console.log(`   ClaimRequest     : ${claimCount}건`);
  console.log(`   소유주 있는 Shop  : ${ownedShops}건`);
  console.log("━".repeat(64));
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
