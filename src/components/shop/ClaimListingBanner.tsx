"use client";

import { useState } from "react";
import { ShieldCheck, Info, X } from "lucide-react";
import ClaimRequestForm from "./ClaimRequestForm";

interface Props {
  shopId:  number;
  company: string;
}

/**
 * 스크랩 업소 상세 페이지 상단에 노출.
 * "이 업소 정보는 외부 수집 데이터 — 실 업주이시면 클레임" 안내.
 * Phase 1 에서는 클레임 버튼이 모달 안내 (실제 클레임 폼은 Phase 2 에서 구현).
 */
export default function ClaimListingBanner({ shopId, company }: Props) {
  const [hidden,   setHidden]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 px-5 py-4 shadow-sm">
        <button
          onClick={() => setHidden(true)}
          aria-label="배너 닫기"
          className="absolute right-3 top-3 text-amber-300 hover:text-amber-500 transition-colors"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              이 업소의 실제 업주이신가요?
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              <span className="font-semibold text-amber-700">"{company}"</span> 정보는 외부 데이터로부터
              자동 수집되었습니다. 실제 업주이시면{" "}
              <strong className="text-gray-700">소유권 주장</strong> 후
              직접 사진·연락처·홍보 문구를 관리하실 수 있습니다.
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-sm hover:shadow-md hover:brightness-110 transition-all"
              >
                <ShieldCheck size={12} />
                업소 소유권 주장하기
              </button>
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600/70">
                <Info size={11} />
                무료 · 관리자 검토 후 즉시 권한 이양
              </span>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ClaimGuideModal shopId={shopId} company={company} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

function ClaimGuideModal({
  shopId, company, onClose,
}: { shopId: number; company: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-500" />
            업소 소유권 주장
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </header>

        <div className="p-5 overflow-y-auto">
          <ClaimRequestForm shopId={shopId} company={company} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}
