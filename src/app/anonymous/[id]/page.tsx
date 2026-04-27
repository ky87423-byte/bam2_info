import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, UserCircle, Eye, Pencil } from "lucide-react";
import { requireLogin } from "../guard";
import { getBoardPostById } from "@/lib/actions/boardPost";
import CommentSection from "@/components/comments/CommentSection";
import DeleteAnonymousPostButton from "../DeleteAnonymousPostButton";

export default async function AnonymousDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireLogin(`/anonymous/${id}`);   // 비회원 → 로그인으로

  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const post = await getBoardPostById(postId);
  if (!post || post.category !== "anonymous") notFound();

  const isAuthor = post.authorId === access.userId;
  const canEdit  = isAuthor || access.role === "admin";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/anonymous" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={14} /> 목록으로
      </Link>

      <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
            <UserCircle size={10} /> 익명 게시판
          </span>
        </div>

        <header className="px-6 pb-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">{post.title}</h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[11px] font-bold">
                ?
              </div>
              <span className="font-semibold text-gray-700">익명</span>
              {/* admin 전용 — 운영 책임 추적 위해 작성자 정보 노출 */}
              {access.role === "admin" && (
                <span className="text-[10px] text-gray-400">
                  (admin: {post.author.nickname} #{post.authorId})
                </span>
              )}
            </div>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{new Date(post.createdAt).toLocaleString("ko-KR")}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-gray-400">
              <Eye size={11} /> {post.viewCount}
            </span>
          </div>
        </header>

        <div className="px-6 py-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </div>

        {canEdit && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <Link
              href={`/anonymous/${post.id}/edit`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Pencil size={11} /> 수정
            </Link>
            <DeleteAnonymousPostButton postId={post.id} />
          </div>
        )}
      </article>

      {/* 댓글 — boardType="anonymous" 로 익명 모드 활성 */}
      <CommentSection boardType="anonymous" postId={post.id} />
    </div>
  );
}
