import { prisma } from "./prisma";
import { UserRole, UserStatus } from "@/generated/prisma/enums";

/**
 * 스크랩 업소를 위한 가상 User 계정을 lazy 생성/조회.
 *
 * 핵심 약속
 *   - username = `_v${shopId}` (영숫자 + 언더스코어, @unique 안전)
 *   - nickname = shop.company (이모지·특수문자 OK, 표시용)
 *   - role = SHOP, status = ACTIVE, passwordHash = "", isVirtual = true
 *   - 인증 경로(auth.ts)에서 isVirtual 또는 passwordHash="" 체크로 로그인 불가
 *   - Shop.virtualUserId @unique 로 1:1 매핑 (중복 생성 방지)
 *
 * 호출 시점: 댓글 답글, 쪽지 발송, 프로필 모달 등 실제로 가상 User가 필요한 순간에 lazy 호출.
 * 4,000개 한꺼번에 생성하지 않음 → DB 사용자 수 폭증 회피, 자연 증가.
 */
export async function ensureVirtualUserForShop(shop: {
  id: number;
  company: string;
}): Promise<number> {
  // 1) 이미 매핑된 가상 User 있으면 재사용
  const existing = await prisma.shop.findUnique({
    where: { id: shop.id },
    select: { virtualUserId: true, isScraped: true },
  });
  if (!existing) throw new Error(`Shop #${shop.id} 가 존재하지 않습니다.`);
  if (existing.virtualUserId) return existing.virtualUserId;

  // 2) username 충돌 방지 — `_v${id}` 패턴은 회원 가입 시 영숫자 검증에서 자동 차단됨
  const username = `_v${shop.id}`;
  const nickname = (shop.company || `업소 #${shop.id}`).slice(0, 50);

  // 3) 만에 하나 같은 username 의 user 가 이미 있으면 그 id 재사용 (멱등 보장)
  const preexisting = await prisma.user.findUnique({
    where: { username },
    select: { id: true, isVirtual: true },
  });
  let userId: number;
  if (preexisting) {
    if (!preexisting.isVirtual) {
      // 매우 드문 케이스: username이 어쩌다 실제 회원과 겹침 — 로그만 남기고 throw
      throw new Error(`username "${username}" 이 실제 회원에 의해 점유됨. shopId=${shop.id}`);
    }
    userId = preexisting.id;
  } else {
    const created = await prisma.user.create({
      data: {
        username,
        nickname,
        passwordHash: "",
        role:   UserRole.SHOP,
        status: UserStatus.ACTIVE,
        isVirtual: true,
        memo: `[자동생성] 스크랩 업소 #${shop.id} 의 가상 계정`,
      },
      select: { id: true },
    });
    userId = created.id;
  }

  // 4) Shop ↔ User 양방향 링크 완성
  await prisma.shop.update({
    where: { id: shop.id },
    data:  { virtualUserId: userId },
  });

  return userId;
}

/**
 * Shop 의 virtualUserId가 있다면 반환, 없으면 null.
 * 신규 생성은 하지 않는 순수 조회.
 */
export async function getVirtualUserIdForShop(shopId: number): Promise<number | null> {
  const row = await prisma.shop.findUnique({
    where:  { id: shopId },
    select: { virtualUserId: true },
  });
  return row?.virtualUserId ?? null;
}
