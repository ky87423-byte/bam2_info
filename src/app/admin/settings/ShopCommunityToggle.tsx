"use client";

import { useState, useTransition } from "react";
import { Lock, Unlock, Check } from "lucide-react";
import { setShopCommunityActiveAction } from "@/lib/actions/siteConfig";

interface Props {
  initialActive: boolean;
}

/**
 * 마스터 스위치 — ON 시:
 *   - 업소회원/관리자 헤더에 메뉴 노출
 *   - /shop-community 라우트 진입 가능
 * OFF 시:
 *   - 메뉴 숨김 + 라우트 가드가 redirect('/') 처리
 */
export default function ShopCommunityToggle({ initialActive }: Props) {
  const [active,  setActive]  = useState(initialActive);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTrans] = useTransition();

  const toggle = () => {
    setError(null); setSaved(false);
    const next = !active;
    startTrans(async () => {
      const res = await setShopCommunityActiveAction(next);
      if (!res.ok) { setError(res.error); return; }
      setActive(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={[
            "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
            active ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400",
          ].join(" ")}>
            {active ? <Unlock size={16} /> : <Lock size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              비밀 게시판 활성화
              <span className={[
                "ml-2 inline-block text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide",
                active ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400",
              ].join(" ")}>
                {active ? "ON" : "OFF"}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              ON 시 업소회원·관리자에게만 헤더 메뉴 노출 + <code className="text-gray-700 bg-gray-50 px-1 rounded">/shop-community</code> 접근 허용.
              <br />
              OFF 시 메뉴 숨김 + 라우트 자체 차단 (직접 URL 입력 시 메인으로 리다이렉트).
            </p>
          </div>
        </div>

        {/* iOS 스타일 스위치 */}
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={toggle}
          disabled={pending}
          className={[
            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 disabled:opacity-50",
            active ? "bg-purple-500" : "bg-gray-300",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              active ? "translate-x-6" : "translate-x-1",
            ].join(" ")}
          />
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      {saved && (
        <p className="mt-3 text-xs text-green-600 inline-flex items-center gap-1">
          <Check size={12} /> 저장됐습니다 — 변경사항 즉시 적용
        </p>
      )}
    </div>
  );
}
