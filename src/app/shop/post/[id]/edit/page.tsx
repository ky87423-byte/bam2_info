import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getUserById, getAreas, getShopPostById } from "@/lib/data";
import { actionUpdateShopPost } from "@/lib/actions/shop-post";
import ShopPostForm from "../../ShopPostForm";

export default async function EditShopPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);
  if (!user) redirect("/login");

  const postId = parseInt(id);
  const post = getShopPostById(postId);
  if (!post) notFound();

  if (post.authorId !== userId && user.role !== "admin") redirect("/shop/dashboard");

  const areas = getAreas();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">업소 게시글 수정</h1>
        <p className="text-sm text-gray-500 mt-1">
          수정 후 다시 관리자 승인을 거쳐야 노출됩니다.
        </p>
      </div>
      <ShopPostForm
        areas={areas}
        action={actionUpdateShopPost}
        defaultValues={post}
        submitLabel="수정 저장 (재승인 요청)"
      />
    </div>
  );
}
