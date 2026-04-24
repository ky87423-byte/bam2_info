"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginAction, type LoginState } from "@/lib/actions/auth";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

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
    </form>
  );
}
