import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, Pencil, Briefcase, Shield } from "lucide-react";
import { auth } from "@/auth";
import { getBoardPostById } from "@/lib/actions/boardPost";
import CommentSection from "@/components/comments/CommentSection";
import Breadcrumb from "@/components/Breadcrumb";
import DeleteJobPostButton from "../DeleteJobPostButton";

function parsePrefix(title: string): { type: "구인" | "구직" | null; rest: string } {
  if (title.startsWith("[구인]")) return { type: "구인", rest: title.slice(4).trim() };
  if (title.startsWith("[구직]")) return { type: "구직", rest: title.slice(4).trim() };
  return { type: null, rest: title };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : null;
  const role   = session?.user?.role ?? "guest";

  const post = await getBoardPostById(postId);
  if (!post || post.category !== "jobs") notFound();

  const isAuthor = userId !== null && post.authorId === userId;
  const canEdit  = isAuthor || role === "admin";

  const { type: prefix, rest } = parsePrefix(post.title);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumb items={[
        { label: "커뮤니티" },
        { label: "구인구직", href: "/jobs" },
        { label: rest || post.title },
      ]} />

      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-yellow-600 mb-4">
        <ChevronLeft size={14} /> 목록으로
      </Link>

      <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
            <Briefcase size={10} /> 구인구직
          </span>
          {prefix && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              prefix === "구인"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              [{prefix}]
            </span>
          )}
        </div>

        <header className="px-6 pb-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">{rest || post.title}</h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold",
                post.author.role === "ADMIN" ? "bg-purple-100 text-purple-700"
                : post.author.role === "SHOP" ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600",
              ].join(" ")}>
                {post.author.nickname.slice(0, 1)}
              </div>
              <span className="font-semibold text-gray-700">{post.author.nickname}</span>
              {post.author.role === "ADMIN" && (
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold">
                  <Shield size={9} /> 관리자
                </span>
              )}
            </div>
            <span className="text-gray-300">·</span>
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
              href={`/jobs/${post.id}/edit`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Pencil size={11} /> 수정
            </Link>
            <DeleteJobPostButton postId={post.id} />
          </div>
        )}
      </article>

      {/* 댓글 — boardType="jobs" */}
      <CommentSection boardType="jobs" postId={post.id} />

      <p className="text-center text-[11px] text-gray-400 mt-4">
        💡 연락은 댓글 또는 쪽지로 안전하게 주고받으세요.
      </p>
    </div>
  );
}
