"use server";

// ─────────────────────────────────────────────────────────────────────────────
// DEV ONLY — 로컬 테스트용 즉시 로그인 server actions
// production 환경에서는 모든 함수가 즉시 throw 하여 호출 불가.
// ─────────────────────────────────────────────────────────────────────────────

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, UserStatus } from "@/generated/prisma/enums";

type DevRole = "admin" | "shop" | "user";

const TEST_USERS: Record<DevRole, { username: string; nickname: string; role: UserRole }> = {
  admin: { username: "_dev_admin", nickname: "테스트관리자", role: UserRole.ADMIN },
  shop:  { username: "_dev_shop",  nickname: "테스트업소",   role: UserRole.SHOP  },
  user:  { username: "_dev_user",  nickname: "테스트유저",   role: UserRole.USER  },
};

async function ensureTestUser(cfg: (typeof TEST_USERS)[DevRole]) {
  const existing = await prisma.user.findUnique({ where: { username: cfg.username } });
  if (existing) {
    // 차단된 적이 있으면 다시 활성화 (테스트 용이성)
    if (existing.status !== UserStatus.ACTIVE || existing.role !== cfg.role) {
      await prisma.user.update({
        where: { id: existing.id },
        data:  { status: UserStatus.ACTIVE, role: cfg.role },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      username:     cfg.username,
      nickname:     cfg.nickname,
      passwordHash: "",
      role:         cfg.role,
      status:       UserStatus.ACTIVE,
      memo:         "[DEV] 자동 생성된 테스트 계정 (로컬 전용)",
    },
  });
}

export async function devLoginAction(role: DevRole) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("dev-login is disabled in production");
  }
  const cfg = TEST_USERS[role];
  if (!cfg) throw new Error(`invalid dev role: ${role}`);

  await ensureTestUser(cfg);
  await signIn("dev-bypass", { username: cfg.username, redirectTo: "/" });
}
