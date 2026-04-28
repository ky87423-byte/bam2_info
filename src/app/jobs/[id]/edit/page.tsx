import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { getBoardPostById } from "@/lib/actions/boardPost";
import Breadcrumb from "@/components/Breadcrumb";
import JobPostForm from "../../JobPostForm";

function parsePrefix(title: string): { type: "구인" | "구직"; rest: string } {
  if (title.startsWith("[구인]")) return { type: "구인", rest: title.slice(4).trim() };
  if (title.startsWith("[구직]")) return { type: "구직", rest: title.slice(4).trim() };
  return { type: "구인", rest: title };  // 폴백
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const post = await getBoardPostById(postId);
  if (!post || post.category !== "jobs") notFound();

  const userId  = parseInt(session.user.id, 10);
  const isAdmin = session.user.role === "admin";
  if (post.authorId !== userId && !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-gray-500">
        본인의 글만 수정할 수 있습니다.
      </div>
    );
  }

  const { type, rest } = parsePrefix(post.title);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumb items={[
        { label: "커뮤니티" },
        { label: "구인구직", href: "/jobs" },
        { label: "수정" },
      ]} />

      <Link href={`/jobs/${post.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-yellow-600 mb-4">
        <ChevronLeft size={14} /> 글로 돌아가기
      </Link>

      <div className="flex items-center gap-2 mb-5">
        <Pencil size={18} className="text-yellow-600" />
        <h1 className="text-xl font-bold text-gray-800">구인구직 글 수정</h1>
      </div>

      <JobPostForm postId={post.id} initialType={type} initialTitle={rest} initialContent={post.content} />
    </div>
  );
}
