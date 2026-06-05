import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncListVisibilityAction } from "@/lib/actions/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/sync/visibility
 *
 * urls.json ↔ DB 가시성 동기화 (목록에 보임/사라짐 → ACTIVE/MISSING/ARCHIVED).
 * 인증은 /api/admin/sync 와 동일: admin 세션 쿠키 또는 X-Sync-Key 헤더.
 *
 * 예시 (cron / 로컬 파이프라인):
 *   curl -X POST -H "X-Sync-Key: $SYNC_API_KEY" http://127.0.0.1:3000/api/admin/sync/visibility
 */
export async function POST(request: Request) {
  const headerKey = request.headers.get("x-sync-key");
  const envKey    = process.env.SYNC_API_KEY;
  const keyAuth   = !!envKey && !!headerKey && headerKey === envKey;

  let userAuth = false;
  if (!keyAuth) {
    const session = await auth();
    userAuth = session?.user?.role === "admin";
  }

  if (!keyAuth && !userAuth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncListVisibilityAction();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
