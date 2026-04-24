import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getShopPosts } from "@/lib/data";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  const { total } = getShopPosts({ status: "pending" });
  return NextResponse.json({ count: total });
}
