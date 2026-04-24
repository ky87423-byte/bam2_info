"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { actionUpdateUser, actionDeleteUser } from "@/lib/actions/user";
import type { UserData } from "@/lib/data";

export default function UserEditForm({ user }: { user: UserData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleDelete = () => {
    if (!confirm(`"${user.username}" 회원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      await actionDeleteUser(user.id);
      router.push("/admin/users");
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaved(false);
    startTransition(async () => {
      await actionUpdateUser(formData);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="prevStatus" value={user.status} />

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">회원 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="아이디" name="username" defaultValue={user.username} required />
          <Field label="닉네임" name="nickname" defaultValue={user.nickname} />
          <div>
            <label className="text-xs text-gray-500 block mb-1">레벨</label>
            <select
              name="level"
              defaultValue={user.level}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>
                  Lv.{l}
                </option>
              ))}
            </select>
          </div>
          <Field label="포인트" name="points" type="number" defaultValue={user.points.toString()} />
          <div>
            <label className="text-xs text-gray-500 block mb-1">상태</label>
            <select
              name="status"
              defaultValue={user.status}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="active">활성</option>
              <option value="blocked">차단</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">권한 (Role)</label>
            <select
              name="role"
              defaultValue={user.role ?? "user"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              <option value="user">일반회원</option>
              <option value="shop">업소회원</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">업소 게시글 한도 (1~10)</label>
            <input
              type="number"
              name="shopPostLimit"
              defaultValue={user.shopPostLimit ?? 3}
              min={1}
              max={10}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="col-span-2 flex gap-6">
            <div>
              <span className="text-xs text-gray-500 block mb-1">가입일</span>
              <span className="text-sm text-gray-700">{user.joinedAt}</span>
            </div>
            {user.approvedAt && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">승인일</span>
                <span className="text-sm text-green-700">{user.approvedAt}</span>
              </div>
            )}
            {user.blockedAt && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">차단일</span>
                <span className="text-sm text-red-600">{user.blockedAt}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-gray-500 block mb-1">관리자 메모</label>
          <textarea
            name="memo"
            defaultValue={user.memo}
            rows={3}
            placeholder="내부 메모 (회원에게 노출되지 않음)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          삭제
        </button>
        {saved && (
          <span className="text-xs text-green-600 font-medium">저장되었습니다.</span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, name, defaultValue, type = "text", required,
}: {
  label: string; name: string; defaultValue?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}
