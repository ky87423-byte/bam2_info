import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChevronLeft, MessageSquare } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import FreePostForm from "../FreePostForm";

export default async function NewFreePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/free/new");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumb items={[
        { label: "커뮤니티" },
        { label: "자유게시판", href: "/free" },
        { label: "글쓰기" },
      ]} />

      <Link href="/free" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-yellow-600 mb-4">
        <ChevronLeft size={14} /> 목록으로
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={18} className="text-yellow-600" />
        <h1 className="text-xl font-bold text-gray-800">자유게시판 글 작성</h1>
      </div>
      <p className="text-[11px] text-gray-400 mb-5">
        닉네임이 함께 표시됩니다. 익명으로 작성하려면 <Link href="/anonymous/new" className="text-yellow-700 hover:underline">익명게시판</Link>을 이용해 주세요.
      </p>

      <FreePostForm />
    </div>
  );
}
