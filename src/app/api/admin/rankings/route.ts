import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRankings, type RankingMode } from "@/lib/actions/ranking";

export const dynamic = "force-dynamic";

/**
 * admin 전용 랭킹 API.
 *  ?mode=balance|period&start=<iso>&end=<iso>&limit=100
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const mode = (sp.get("mode") ?? "balance") as RankingMode;
  if (mode !== "balance" && mode !== "period") {
    return NextResponse.json({ error: "mode 는 balance|period" }, { status: 400 });
  }
  const startStr = sp.get("start");
  const endStr   = sp.get("end");
  const limit    = Math.min(parseInt(sp.get("limit") ?? "100", 10) || 100, 100);

  let startDate: Date | undefined;
  let endDate:   Date | undefined;
  if (mode === "period") {
    if (!startStr || !endStr) return NextResponse.json({ error: "기간 모드는 start/end 필수" }, { status: 400 });
    startDate = new Date(startStr);
    endDate   = new Date(endStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "잘못된 날짜" }, { status: 400 });
    }
  }

  try {
    const rows = await getRankings(mode, startDate, endDate, limit);
    return NextResponse.json({ rows, count: rows.length, mode, start: startStr, end: endStr });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
