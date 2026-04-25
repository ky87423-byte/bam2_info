import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { requireShopCommunityAccess } from "../../guard";
import { getBoardPostById } from "@/lib/actions/boardPost";
import BoardPostForm from "../../BoardPostForm";

export default async function ShopCommunityEditPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireShopCommunityAccess();

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const post = await getBoardPostById(postId);
  if (!post || post.category !== "shop_only") notFound();

  // 작성자 본인 또는 admin 만 수정
  if (post.authorId !== access.userId && access.role !== "admin") {
    redirect(`/shop-community/${postId}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/shop-community/${postId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={14} /> 글로 돌아가기
      </Link>

      <div className="flex items-center gap-2 mb-5">
        <Lock size={18} className="text-purple-500" />
        <h1 className="text-xl font-bold text-gray-800">게시글 수정</h1>
      </div>

      <BoardPostForm
        category="shop_only"
        postId={postId}
        initialTitle={post.title}
        initialContent={post.content}
      />
    </div>
  );
}
