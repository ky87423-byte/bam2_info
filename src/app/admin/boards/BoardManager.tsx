"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionCreateNotice, actionUpdateNotice, actionDeleteNotice } from "@/lib/actions/notice";
import type { NoticeData } from "@/lib/data";
import { Plus, Pencil, Trash2, Pin, Eye, EyeOff, X } from "lucide-react";

export default function BoardManager({ initialNotices }: { initialNotices: NoticeData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<NoticeData | null>(null);
  const [showNew, setShowNew] = useState(false);

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      await actionCreateNotice(formData);
      router.refresh();
      setShowNew(false);
    });
  };

  const handleUpdate = (formData: FormData) => {
    startTransition(async () => {
      await actionUpdateNotice(formData);
      router.refresh();
      setEditing(null);
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`"${title}" 공지를 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      await actionDeleteNotice(id);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">게시판 관리</h2>
        <button
          onClick={() => { setShowNew(!showNew); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          <Plus size={14} />
          새 공지 작성
        </button>
      </div>

      {/* 새 공지 폼 */}
      {showNew && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">새 공지 작성</h3>
            <button
              onClick={() => setShowNew(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <NoticeForm onSubmit={handleCreate} pending={pending} />
        </div>
      )}

      {/* 수정 폼 */}
      {editing && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">공지 수정</h3>
            <button
              onClick={() => setEditing(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <NoticeForm notice={editing} onSubmit={handleUpdate} pending={pending} />
        </div>
      )}

      {/* 공지 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {initialNotices.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 text-gray-500 font-medium w-10">#</th>
                <th className="px-4 py-3 text-gray-500 font-medium">제목</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">고정</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">상태</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-28">작성일</th>
                <th className="px-4 py-3 text-gray-500 font-medium w-20 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {initialNotices.map((notice, i) => (
                <tr key={notice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {notice.isPinned && <Pin size={12} className="text-yellow-500 shrink-0" />}
                      <span className="font-medium text-gray-800 truncate max-w-[300px]">{notice.title}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-[300px] mt-0.5">
                      {notice.content.slice(0, 60)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {notice.isPinned ? (
                      <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">고정</span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {notice.isVisible ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <Eye size={11} /> 노출
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <EyeOff size={11} /> 숨김
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{notice.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditing(notice); setShowNew(false); }}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(notice.id, notice.title)}
                        disabled={pending}
                        className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p>등록된 공지사항이 없습니다.</p>
            <p className="text-xs mt-1">위 버튼을 눌러 새 공지를 작성하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NoticeForm({
  notice, onSubmit, pending,
}: {
  notice?: NoticeData;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      {notice && <input type="hidden" name="id" value={notice.id} />}
      <div>
        <label className="text-xs text-gray-500 block mb-1">제목</label>
        <input
          type="text"
          name="title"
          defaultValue={notice?.title}
          required
          placeholder="공지 제목을 입력하세요"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">내용</label>
        <textarea
          name="content"
          defaultValue={notice?.content}
          rows={6}
          required
          placeholder="공지 내용을 입력하세요"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isPinned"
            defaultChecked={notice?.isPinned}
            className="w-4 h-4 accent-yellow-500"
          />
          <span className="text-sm text-gray-700">상단 고정</span>
        </label>
        {notice && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isVisible"
              defaultChecked={notice.isVisible}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-gray-700">노출</span>
          </label>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {pending ? "저장 중..." : notice ? "수정" : "작성"}
        </button>
      </div>
    </form>
  );
}
