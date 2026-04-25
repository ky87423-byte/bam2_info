import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) return NextResponse.json({ count: 0 });

  const count = await prisma.message.count({
    where: { receiverId: userId, isRead: false },
  });
  return NextResponse.json({ count });
}
