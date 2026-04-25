import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureVirtualUserForShop } from "@/lib/virtualUsers";
import { getShopById } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * POST /api/shops/[id]/virtual-user
 *
 * 해당 Shop의 가상 user 계정 id를 반환. 없으면 lazy 생성.
 * 로그인 필요 (스팸 방지).
 *
 * 응답: { userId: number }
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const shopId = parseInt(id, 10);
  if (isNaN(shopId) || shopId <= 0) {
    return NextResponse.json({ error: "Invalid shopId" }, { status: 400 });
  }

  // Prisma Shop 우선 조회 (스크랩 후 import_shops 로 적재된 경우)
  let shopRow = await prisma.shop.findUnique({
    where:  { id: shopId },
    select: { id: true, company: true, virtualUserId: true },
  });

  // Prisma 에 없으면 JSON 카탈로그(getShopById)에서 가져와 Shop 레코드 lazy 생성
  if (!shopRow) {
    const json = getShopById(shopId);
    if (!json) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    shopRow = await prisma.shop.create({
      data: {
        id:        json.id,
        company:   json.company || `업소 #${json.id}`,
        subject:   json.subject ?? "",
        content:   json.content ?? "",
        area:      json.area ?? "",
        category:  json.category ?? "",
        category2: json.category2 ?? "",
        phone:     json.phone ?? "",
        hphone:    json.hphone ?? "",
        telegram:  json.telegram ?? "",
        hit:       json.hit ?? 0,
        price:     json.price ?? 0,
        mainPhoto: json.mainPhoto ?? "",
        photos:    json.photos ?? [],
        time1:     json.time1 ?? "",
        time2:     json.time2 ?? "",
        timeFull:  json.timeFull ?? false,
      },
      select: { id: true, company: true, virtualUserId: true },
    }).catch(async () => {
      // 동시 생성 race → 다시 조회
      return prisma.shop.findUnique({
        where:  { id: shopId },
        select: { id: true, company: true, virtualUserId: true },
      });
    });
    if (!shopRow) return NextResponse.json({ error: "Shop creation failed" }, { status: 500 });
  }

  const userId = await ensureVirtualUserForShop({ id: shopRow.id, company: shopRow.company });
  return NextResponse.json({ userId });
}
