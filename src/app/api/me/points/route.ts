import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 헤더 포인트 배지 라이브 동기화용.
 * 응답: { count: <points> }  — useLiveBadge 가 count 키를 읽음
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });
  const id = parseInt(session.user.id, 10);
  if (isNaN(id)) return NextResponse.json({ count: 0 });
  const u = await prisma.user.findUnique({ where: { id }, select: { points: true } });
  return NextResponse.json({ count: u?.points ?? 0 });
}
