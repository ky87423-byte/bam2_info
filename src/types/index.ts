import type { Shop } from "@/generated/prisma/client";
export type { Shop };

export type ShopWithExtras = Shop & {
  photoList: string[];
  areaClean: string;
};

export function parseShop(shop: Shop): ShopWithExtras {
  return {
    ...shop,
    photoList: shop.photos ?? [],
    areaClean: shop.area.replace(/,+$/, "").trim(),
  };
}
