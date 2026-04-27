import Link from "next/link";
import { ChevronLeft, UserCircle } from "lucide-react";
import { requireLogin } from "../guard";
import AnonymousPostForm from "../AnonymousPostForm";

export default async function AnonymousNewPage() {
  await requireLogin("/anonymous/new");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/anonymous" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={14} /> 목록으로
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <UserCircle size={18} className="text-gray-700" />
        <h1 className="text-xl font-bold text-gray-800">익명 글 작성</h1>
      </div>
      <p className="text-[11px] text-gray-400 mb-5">
        작성자 정보는 다른 회원에게 <strong>익명</strong>으로만 표시됩니다. (관리자에겐 식별 가능 — 어뷰징 시 조치 가능)
      </p>

      <AnonymousPostForm />
    </div>
  );
}
