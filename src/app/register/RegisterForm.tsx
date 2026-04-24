"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterState } from "@/lib/actions/auth";
import type { CaptchaData } from "@/lib/captcha";
import { ShieldCheck } from "lucide-react";

export default function RegisterForm({ captcha }: { captcha: CaptchaData }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerAction, {});

  const v = state.values ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {/* 아이디 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          아이디 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="username"
          required
          autoComplete="username"
          placeholder="영문, 숫자, _ (3자 이상)"
          defaultValue={v.username}
          key={v.username}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
        />
      </div>

      {/* 닉네임 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          닉네임
          <span className="text-xs text-gray-400 ml-1">(비우면 아이디로 사용)</span>
        </label>
        <input
          type="text"
          name="nickname"
          autoComplete="off"
          placeholder="활동명 입력"
          defaultValue={v.nickname}
          key={`nick-${v.nickname}`}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
        />
      </div>

      {/* 비밀번호 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호 <span className="text-red-400">*</span>
        </label>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          placeholder="6자 이상"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
        />
      </div>

      {/* 비밀번호 확인 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호 확인 <span className="text-red-400">*</span>
        </label>
        <input
          type="password"
          name="confirm"
          required
          autoComplete="new-password"
          placeholder="비밀번호 재입력"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
        />
      </div>

      {/* 자동 가입 방지 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
          <ShieldCheck size={14} className="text-blue-500" />
          자동 가입 방지
        </label>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-center border-b border-gray-200">
            <span className="font-mono text-xl font-bold tracking-[0.3em] text-gray-700 select-none">
              {captcha.question.split("").map((ch, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    transform: `rotate(${(i % 3 - 1) * 4}deg) translateY(${i % 2 === 0 ? -1 : 2}px)`,
                    color: ch === "+" ? "#2563eb" : ch === "-" ? "#dc2626" : "#1f2937",
                  }}
                >
                  {ch}
                </span>
              ))}
            </span>
            <span className="ml-2 text-xl font-bold text-gray-500">=</span>
          </div>
          <input
            type="number"
            name="captchaAnswer"
            required
            placeholder="위 계산 결과를 입력하세요"
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-white"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">위 수식의 답을 숫자로 입력하세요</p>
        <input type="hidden" name="captchaToken" value={captcha.token} />
        <input type="hidden" name="captchaTs"    value={captcha.ts} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-yellow-400 text-black font-semibold rounded-lg text-sm hover:bg-yellow-500 transition-colors disabled:opacity-60"
      >
        {pending ? "처리 중..." : "회원가입"}
      </button>

      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-yellow-600 font-medium hover:underline">로그인</Link>
      </p>
      <p className="text-center text-xs text-gray-400 border-t pt-3">
        업소 운영자이신가요?{" "}
        <Link href="/register/shop" className="text-blue-500 font-medium hover:underline">업소회원 가입 신청</Link>
      </p>
    </form>
  );
}
