"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Send, CheckCircle2 } from "lucide-react";
import { createClaimRequestAction } from "@/lib/actions/claim";

interface Props {
  shopId:    number;
  company:   string;
  onCancel?: () => void;
}

export default function ClaimRequestForm({ shopId, company, onCancel }: Props) {
  const [proofText,    setProofText]    = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState(false);
  const [pending,      startTrans]      = useTransition();

  const submit = () => {
    setError(null);
    startTrans(async () => {
      const res = await createClaimRequestAction({
        shopId,
        proofText:    proofText.trim(),
        contactPhone: contactPhone.trim(),
      });
      if (!res.ok) { setError(res.error); return; }
      setSuccess(true);
    });
  };

  if (success) {
    return (
      <div className="py-8 text-center px-2">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 text-green-600 rounded-full mb-3 shadow-sm">
          <CheckCircle2 size={24} />
        </div>
        <p className="text-sm font-bold text-gray-800 mb-1.5">신청이 접수됐습니다</p>
        <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
          관리자가 검토 후 입력하신 연락처로 본인 확인을 진행할 예정입니다.
          <br />검토 결과는 마이페이지에서 확인하실 수 있습니다.
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 transition-colors"
          >
            확인
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
        <p className="font-semibold mb-1 flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-amber-600" />
          {company} 의 실 업주이시면 신청해 주세요
        </p>
        <p className="text-amber-700/90">
          관리자가 입력하신 연락처로 본인 확인 후 권한을 이양합니다.
          허위 신청 시 계정 제재 사유가 됩니다.
        </p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">증빙 내용 <span className="text-red-400">*</span></label>
        <textarea
          value={proofText}
          onChange={(e) => setProofText(e.target.value)}
          placeholder="사업자등록번호, 매장 사진 보유 사실, 실제 운영 정보 등 본인 확인에 도움될 내용 (10자 이상)"
          disabled={pending}
          maxLength={1500}
          rows={5}
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 disabled:bg-gray-50"
        />
        <p className="mt-1 text-[10px] text-gray-400 text-right">{proofText.length} / 1500</p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">검증용 연락처 <span className="text-red-400">*</span></label>
        <input
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="010-1234-5678"
          disabled={pending}
          maxLength={20}
          className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 disabled:bg-gray-50"
        />
        <p className="mt-1 text-[10px] text-gray-400">
          관리자가 본인 확인 위해 직접 연락드립니다.
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-4 py-2 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !proofText.trim() || !contactPhone.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <Send size={13} />
          {pending ? "신청 중..." : "신청하기"}
        </button>
      </div>
    </div>
  );
}
