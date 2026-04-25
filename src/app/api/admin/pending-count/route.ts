import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUsers } from "@/lib/data";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  const { users } = await getUsers("", 1, 9999);
  const count = users.filter((u) => u.role === "shop" && u.status === "blocked").length;
  return NextResponse.json({ count });
}
