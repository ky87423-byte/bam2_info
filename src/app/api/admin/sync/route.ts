import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncShopsFromJsonAction } from "@/lib/actions/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 최대 5분 (대량 데이터 대비)

/**
 * POST /api/admin/sync
 *
 * 외부 cron 또는 admin 수동 트리거용 sync 엔드포인트.
 *
 * 인증 (둘 중 하나):
 *   1. admin role 세션 쿠키 (브라우저 호출)
 *   2. X-Sync-Key 헤더 == process.env.SYNC_API_KEY (서버 호출, 권장)
 *
 * 응답: SyncResult JSON
 *
 * 예시 (cron):
 *   curl -X POST -H "X-Sync-Key: $SYNC_API_KEY" https://your-site.com/api/admin/sync
 *
 *   # crontab 예시 (매일 새벽 4시)
 *   0 4 * * * curl -fsS -X POST -H "X-Sync-Key: ..." https://.../api/admin/sync
 */
export async function POST(request: Request) {
  // 1) 인증
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

  // 2) sync 실행
  const result = await syncShopsFromJsonAction();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
