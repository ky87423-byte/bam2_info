import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, UserCircle } from "lucide-react";
import { requireLogin } from "../../guard";
import { getBoardPostById } from "@/lib/actions/boardPost";
import AnonymousPostForm from "../../AnonymousPostForm";

export default async function AnonymousEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireLogin(`/anonymous/${id}/edit`);

  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const post = await getBoardPostById(postId);
  if (!post || post.category !== "anonymous") notFound();

  if (post.authorId !== access.userId && access.role !== "admin") {
    redirect(`/anonymous/${postId}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/anonymous/${postId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={14} /> 글로 돌아가기
      </Link>

      <div className="flex items-center gap-2 mb-5">
        <UserCircle size={18} className="text-gray-700" />
        <h1 className="text-xl font-bold text-gray-800">익명 글 수정</h1>
      </div>

      <AnonymousPostForm
        postId={postId}
        initialTitle={post.title}
        initialContent={post.content}
      />
    </div>
  );
}
