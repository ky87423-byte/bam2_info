"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createBoardPostAction, updateBoardPostAction } from "@/lib/actions/boardPost";

const CATEGORY = "jobs";

type JobType = "구인" | "구직";

interface Props {
  postId?:         number;
  initialType?:    JobType;
  initialTitle?:   string;
  initialContent?: string;
}

export default function JobPostForm({
  postId, initialType = "구인", initialTitle = "", initialContent = "",
}: Props) {
  const [jobType, setJobType] = useState<JobType>(initialType);
  const [title,   setTitle]   = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTrans] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError(null);
    const finalTitle = `[${jobType}] ${title.trim()}`;
    startTrans(async () => {
      if (postId) {
        const res = await updateBoardPostAction({ id: postId, title: finalTitle, content: content.trim() });
        if (!res.ok) { setError(res.error); return; }
        router.push(`/jobs/${postId}`);
      } else {
        const res = await createBoardPostAction({ category: CATEGORY, title: finalTitle, content: content.trim() });
        if (!res.ok) { setError(res.error); return; }
        router.push(`/jobs/${res.data?.id}`);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      {/* 말머리 — 구인/구직 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">말머리</label>
        <div className="flex gap-2">
          {(["구인", "구직"] as JobType[]).map((t) => (
            <label
              key={t}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-semibold transition-colors ${
                jobType === t
                  ? t === "구인"
                    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                    : "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio" name="jobType" value={t}
                checked={jobType === t} onChange={() => setJobType(t)}
                className="sr-only"
              />
              [{t}]
            </label>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={jobType === "구인" ? "예: 강남 매장 매니저 모집" : "예: 강북권 매장 일자리 찾습니다"}
          disabled={pending}
          maxLength={194}
          className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 disabled:bg-gray-50"
        />
        <p className="mt-1 text-[10px] text-gray-400 text-right">{title.length} / 194 (말머리 자동 추가)</p>
      </div>

      {/* 내용 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="근무 조건, 시급/급여, 위치, 연락 방법 등을 자세히 적어주세요."
          disabled={pending}
          maxLength={20000}
          rows={12}
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 disabled:bg-gray-50"
        />
        <p className="mt-1 text-[10px] text-gray-400 text-right">{content.length} / 20000</p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="px-4 py-2 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !title.trim() || !content.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-semibold hover:bg-yellow-500 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={13} />
          {pending ? "저장 중..." : (postId ? "수정 완료" : "등록")}
        </button>
      </div>
    </div>
  );
}
