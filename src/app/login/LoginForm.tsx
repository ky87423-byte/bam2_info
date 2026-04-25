"use client";

import { useActionState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { devLoginAction } from "@/lib/actions/devAuth";

export default function LoginForm({ isDev = false }: { isDev?: boolean }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [devPending, startDevTransition] = useTransition();

  const devLogin = (role: "admin" | "shop" | "user") => {
    startDevTransition(() => { devLoginAction(role); });
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
        <input
          type="text"
          name="username"
          required
          autoComplete="username"
          placeholder="아이디 입력"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="비밀번호 입력"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-yellow-400 text-black font-semibold rounded-lg text-sm hover:bg-yellow-500 transition-colors disabled:opacity-60"
      >
        {pending ? "로그인 중..." : "로그인"}
      </button>

      <p className="text-center text-sm text-gray-500">
        계정이 없으신가요?{" "}
        <Link href="/register" className="text-yellow-600 font-medium hover:underline">
          회원가입
        </Link>
      </p>

      {isDev && (
        <div className="mt-6 pt-4 border-t border-dashed border-gray-300">
          <p className="text-[11px] text-center text-gray-400 mb-2">
            🛠 DEV ONLY — 비밀번호 검증 없이 즉시 로그인
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={devPending}
              onClick={() => devLogin("admin")}
              className="py-2 text-xs font-medium rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-60"
            >
              관리자
            </button>
            <button
              type="button"
              disabled={devPending}
              onClick={() => devLogin("shop")}
              className="py-2 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-60"
            >
              업소
            </button>
            <button
              type="button"
              disabled={devPending}
              onClick={() => devLogin("user")}
              className="py-2 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              일반 유저
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
