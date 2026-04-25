import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, nickname: true, role: true,
      level: true, joinedAt: true, status: true,
    },
  });
  if (!u || u.status === "BLOCKED") return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id:        u.id,
    username:  u.username,
    nickname:  u.nickname,
    role:      String(u.role).toLowerCase(),
    level:     u.level,
    joinedAt:  u.joinedAt.toISOString().slice(0, 10),
  });
}
