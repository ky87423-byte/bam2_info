import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserById, getAreas, countShopPostsByAuthor } from "@/lib/data";
import { actionCreateShopPost } from "@/lib/actions/shop-post";
import ShopPostForm from "../ShopPostForm";

export default async function NewShopPostPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);
  if (!user || (user.role !== "shop" && user.role !== "admin")) redirect("/");

  const limit = user.shopPostLimit ?? 3;
  const count = countShopPostsByAuthor(userId);
  if (count >= limit) redirect("/shop/dashboard");

  const areas = getAreas();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">새 업소 게시글 작성</h1>
        <p className="text-sm text-gray-500 mt-1">
          작성 후 관리자 승인을 거쳐 일반 회원에게 노출됩니다. ({count + 1}/{limit})
        </p>
      </div>
      <ShopPostForm areas={areas} action={actionCreateShopPost} />
    </div>
  );
}
