import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 업소 소유권 클레임 신청 중 admin 검토 대기(=PENDING) 카운트.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  const count = await prisma.claimRequest.count({ where: { status: "PENDING" } });
  return NextResponse.json({ count });
}
