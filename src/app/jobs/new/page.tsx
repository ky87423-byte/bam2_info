import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChevronLeft, Briefcase } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import JobPostForm from "../JobPostForm";

export default async function NewJobPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/jobs/new");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumb items={[
        { label: "커뮤니티" },
        { label: "구인구직", href: "/jobs" },
        { label: "글쓰기" },
      ]} />

      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-yellow-600 mb-4">
        <ChevronLeft size={14} /> 목록으로
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <Briefcase size={18} className="text-yellow-600" />
        <h1 className="text-xl font-bold text-gray-800">구인구직 글 작성</h1>
      </div>
      <p className="text-[11px] text-gray-400 mb-5">
        말머리(구인/구직)를 선택하면 제목 앞에 자동으로 추가됩니다.
        연락은 <strong>댓글</strong>로 안전하게 — 개인정보(전화/SNS)는 본문에 직접 노출하지 마세요.
      </p>

      <JobPostForm />
    </div>
  );
}
