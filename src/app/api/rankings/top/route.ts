import { NextResponse } from "next/server";
import { getRankings } from "@/lib/actions/ranking";

export const dynamic = "force-dynamic";

/**
 * 공개 TOP 10 — 메인 페이지 명예의 전당 위젯용.
 * 항상 보유 포인트 (잔액) 기준. 캐시 1h.
 */
export async function GET() {
  const rows = await getRankings("balance", undefined, undefined, 10);
  return NextResponse.json({ rows });
}
