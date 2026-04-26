import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * admin 쪽지 관리 페이지 미확인 카운트.
 * Message.adminAcknowledgedAt IS NULL → admin 이 아직 "확인" 버튼 안 누른 쪽지.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  const count = await prisma.message.count({ where: { adminAcknowledgedAt: null } });
  return NextResponse.json({ count });
}
