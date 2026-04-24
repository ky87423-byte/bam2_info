"use client";

import { useTransition } from "react";
import { actionSaveBoardPermissions } from "@/lib/actions/notice";
import { useRouter } from "next/navigation";
import type { BoardPermissions } from "@/lib/data";

const PERMISSIONS = [
  { key: "read",  label: "읽기" },
  { key: "write", label: "쓰기" },
  { key: "edit",  label: "수정" },
] as const;

const ROLES = [
  { key: "guest", label: "비로그인" },
  { key: "user",  label: "일반회원" },
  { key: "shop",  label: "업소회원" },
] as const;

export default function BoardPermissionsForm({ permissions }: { permissions: BoardPermissions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await actionSaveBoardPermissions(formData);
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 className="font-semibold text-gray-700 mb-1">게시판 권한 설정</h3>
      <p className="text-xs text-gray-400 mb-5">각 역할별로 게시판 접근 권한을 설정합니다.</p>

      <form action={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="w-24 pb-3 text-left text-xs text-gray-400 font-medium">권한</th>
                {ROLES.map(({ key, label }) => (
                  <th key={key} className="pb-3 text-center text-xs text-gray-500 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {PERMISSIONS.map(({ key: perm, label }) => (
                <tr key={perm} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 pr-4">
                    <span className="inline-block text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full w-14 text-center">
                      {label}
                    </span>
                  </td>
                  {ROLES.map(({ key: role }) => {
                    const name = `${perm}_${role}`;
                    const checked = permissions[perm][role];
                    return (
                      <td key={role} className="py-3.5 text-center">
                        <input
                          type="checkbox"
                          name={name}
                          defaultChecked={checked}
                          className="w-4 h-4 accent-blue-500 cursor-pointer"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            * 수정 권한은 본인 글에만 적용됩니다.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {pending ? "저장 중..." : "권한 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
