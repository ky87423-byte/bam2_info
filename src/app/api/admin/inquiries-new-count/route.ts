import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 가상 업소 우회 인콰이어리 중 admin 미확인(=NEW) 카운트.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  const count = await prisma.adminInquiry.count({ where: { status: "NEW" } });
  return NextResponse.json({ count });
}
