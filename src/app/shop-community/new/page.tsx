import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { requireShopCommunityAccess } from "../guard";
import BoardPostForm from "../BoardPostForm";

export default async function ShopCommunityNewPage() {
  await requireShopCommunityAccess();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/shop-community" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={14} /> 목록으로
      </Link>

      <div className="flex items-center gap-2 mb-5">
        <Lock size={18} className="text-purple-500" />
        <h1 className="text-xl font-bold text-gray-800">새 글 작성</h1>
      </div>

      <BoardPostForm category="shop_only" />
    </div>
  );
}
