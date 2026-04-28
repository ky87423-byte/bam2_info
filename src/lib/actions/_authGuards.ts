"use server";

import { auth } from "@/auth";

/**
 * admin server action 들에서 첫 줄에 호출. 미들웨어가 페이지 라우트만 보호하므로
 * server action 은 별도 ORIGIN 에서 직접 호출될 수 있어 (CSRF 방어 + 정책 일관성),
 * 액션 자체에 role 체크가 반드시 필요함.
 *
 * 사용:
 *   const guard = await requireAdmin();
 *   if (!guard.ok) return { error: guard.error };
 *
 * 또는 throw 형태:
 *   await assertAdmin();
 */
export async function requireAdmin(): Promise<
  | { ok: true; userId: number }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "로그인이 필요합니다." };
  if (session.user.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다." };
  return { ok: true, userId: parseInt(session.user.id, 10) };
}

/** void/throw 가 필요한 액션 (return 형식 없음) — 권한 없으면 아무것도 안 하고 조용히 종료 */
export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "admin";
}
