"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createBoardPostAction, updateBoardPostAction } from "@/lib/actions/boardPost";

interface Props {
  category:    string;
  postId?:     number;          // 수정 시 전달
  initialTitle?:   string;
  initialContent?: string;
}

export default function BoardPostForm({
  category, postId, initialTitle = "", initialContent = "",
}: Props) {
  const [title,   setTitle]   = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTrans] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError(null);
    startTrans(async () => {
      if (postId) {
        const res = await updateBoardPostAction({ id: postId, title: title.trim(), content: content.trim() });
        if (!res.ok) { setError(res.error); return; }
        router.push(`/shop-community/${postId}`);
      } else {
        const res = await createBoardPostAction({ category, title: title.trim(), content: content.trim() });
        if (!res.ok) { setError(res.error); return; }
        router.push(`/shop-community/${res.data?.id}`);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          disabled={pending}
          maxLength={200}
          className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:bg-gray-50"
        />
        <p className="mt-1 text-[10px] text-gray-400 text-right">{title.length} / 200</p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          disabled={pending}
          maxLength={20000}
          rows={12}
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:bg-gray-50"
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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold hover:brightness-110 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={13} />
          {pending ? "저장 중..." : (postId ? "수정 완료" : "등록")}
        </button>
      </div>
    </div>
  );
}
