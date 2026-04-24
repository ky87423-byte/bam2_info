"use client";

import { useActionState } from "react";
import Link from "next/link";
import { shopRegisterAction, type ShopRegisterState } from "@/lib/actions/auth";
import type { CaptchaData } from "@/lib/captcha";
import { ShieldCheck, CheckCircle } from "lucide-react";

const CATEGORIES = [
  "술집", "나이트클럽", "단란주점", "룸살롱", "노래방",
  "클럽", "헌팅포차", "풀살롱", "바", "유흥주점", "기타",
];

export default function ShopRegisterForm({
  captcha,
  areas,
}: {
  captcha: CaptchaData;
  areas: string[];
}) {
  const [state, action, pending] = useActionState<ShopRegisterState, FormData>(shopRegisterAction, {});

  if (state.success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex justify-center">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">신청이 완료되었습니다!</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          관리자 승인 후 로그인 및 업소 게시글 작성이 가능합니다.<br />
          승인까지 1~2 영업일이 소요될 수 있습니다.
        </p>
        <Link
          href="/login"
          className="inline-block mt-4 px-6 py-2.5 bg-yellow-400 text-black font-semibold rounded-lg text-sm hover:bg-yellow-500 transition-colors"
        >
          로그인 페이지로
        </Link>
      </div>
    );
  }

  const v = state.values ?? {};

  return (
    <form action={action} className="space-y-5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pb-1 border-b">계정 정보</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="아이디 *" name="username" placeholder="영문, 숫자, _ (3자 이상)" autoComplete="username" defaultValue={v.username} />
        <Field label="닉네임" name="nickname" placeholder="비우면 아이디 사용" defaultValue={v.nickname} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="비밀번호 *" name="password" type="password" placeholder="6자 이상" autoComplete="new-password" />
        <Field label="비밀번호 확인 *" name="confirm" type="password" placeholder="재입력" autoComplete="new-password" />
      </div>

      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pb-1 border-b pt-2">업소 정보</p>

      <Field label="업소명 *" name="company" placeholder="실제 운영 중인 업소명" defaultValue={v.company} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">업종</label>
          <select
            name="category"
            defaultValue={v.category ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 bg-white"
          >
            <option value="">선택</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
          <select
            name="area"
            defaultValue={v.area ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 bg-white"
          >
            <option value="">선택</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <Field label="연락처" name="phone" placeholder="010-0000-0000" type="tel" defaultValue={v.phone} />

      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pb-1 border-b pt-2">자동 가입 방지</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
          <ShieldCheck size={14} className="text-blue-500" />
          보안 코드
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
        <input type="hidden" name="captchaToken" value={captcha.token} />
        <input type="hidden" name="captchaTs"    value={captcha.ts} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-yellow-400 text-black font-semibold rounded-lg text-sm hover:bg-yellow-500 transition-colors disabled:opacity-60"
      >
        {pending ? "처리 중..." : "업소회원 가입 신청"}
      </button>

      <p className="text-center text-sm text-gray-500">
        일반 회원가입은{" "}
        <Link href="/register" className="text-yellow-600 font-medium hover:underline">여기</Link>
        {" "}/ 이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-yellow-600 font-medium hover:underline">로그인</Link>
      </p>
    </form>
  );
}

function Field({ label, name, placeholder, type = "text", autoComplete, defaultValue }: {
  label: string; name: string; placeholder?: string; type?: string; autoComplete?: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
      />
    </div>
  );
}
