"use client";

import { useState, useTransition } from "react";
import { Phone, Smartphone, MapPin, ChevronDown, ChevronUp, Check, X, AlertCircle } from "lucide-react";
import { approveClaimAction, rejectClaimAction } from "@/lib/actions/claim";
import type { ClaimStatus } from "@/generated/prisma/enums";

interface Claim {
  id:           number;
  status:       ClaimStatus;
  proofText:    string;
  contactPhone: string;
  adminNote:    string;
  createdAt:    string;
  reviewedAt:   string | null;
}
interface Claimant { id: number; nickname: string; username: string; role: string; }
interface Shop     { id: number; company: string; phone: string; hphone: string; area: string; ownerId: number | null; }

const STATUS_COLOR: Record<string, string> = {
  PENDING:  "bg-amber-50  text-amber-700  ring-amber-200",
  APPROVED: "bg-green-50  text-green-700  ring-green-200",
  REJECTED: "bg-gray-100  text-gray-500   ring-gray-200",
};
const STATUS_LABEL_KO: Record<string, string> = {
  PENDING: "대기 중", APPROVED: "승인됨", REJECTED: "거절됨",
};

export default function ClaimRow({ claim, claimant, shop }: { claim: Claim; claimant: Claimant; shop: Shop }) {
  const [open, setOpen] = useState(claim.status === "PENDING");
  const [note, setNote] = useState(claim.adminNote);
  const [pending, startTrans] = useTransition();

  const approve = () => {
    if (!confirm(`"${shop.company}" 의 소유권을 ${claimant.nickname}(@${claimant.username}) 에게 이양합니다. 진행할까요?`)) return;
    startTrans(async () => { await approveClaimAction(claim.id, note); });
  };
  const reject = () => {
    if (!confirm("이 신청을 거절합니다. 진행할까요?")) return;
    startTrans(async () => { await rejectClaimAction(claim.id, note); });
  };

  return (
    <li className={["p-4 hover:bg-gray-50/60 transition-colors", pending && "opacity-50"].filter(Boolean).join(" ")}>
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left flex items-start gap-3">
        <span className={[
          "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full ring-1 font-bold shrink-0",
          STATUS_COLOR[claim.status],
        ].join(" ")}>
          {STATUS_LABEL_KO[claim.status]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-semibold text-amber-700 truncate">{shop.company}</span>
            <span className="text-gray-300">←</span>
            <span className="text-gray-400">신청자</span>
            <span className="font-semibold text-gray-700">{claimant.nickname}</span>
            <span className="text-gray-400">(@{claimant.username})</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400 shrink-0">{formatDate(claim.createdAt)}</span>
            {shop.ownerId && shop.ownerId !== claimant.id && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-500 ring-1 ring-red-200 bg-red-50 px-1.5 py-0.5 rounded-full">
                <AlertCircle size={9} /> 다른 회원 소유 중
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 mt-1" /> : <ChevronDown size={14} className="text-gray-400 mt-1" />}
      </button>

      {open && (
        <div className="mt-3 pl-12 space-y-3">
          {/* 증빙 본문 */}
          <div className="bg-white rounded-xl ring-1 ring-gray-100 px-4 py-3">
            <p className="text-[11px] text-gray-400 mb-1">증빙 내용</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{claim.proofText}</p>
          </div>

          {/* 신청자 연락처 vs 업소 등록 연락처 비교 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs">
              <p className="text-gray-500 mb-1">📞 신청자 연락처</p>
              <a href={`tel:${claim.contactPhone}`} className="font-semibold text-blue-700 hover:underline">
                {claim.contactPhone || "(없음)"}
              </a>
            </div>
            <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs">
              <p className="text-gray-500 mb-1">📋 등록된 업소 연락처</p>
              <div className="space-y-0.5">
                {shop.phone && (
                  <a href={`tel:${shop.phone}`} className="block font-semibold text-amber-800 hover:underline">
                    <Phone size={10} className="inline" /> {shop.phone}
                  </a>
                )}
                {shop.hphone && (
                  <a href={`tel:${shop.hphone}`} className="block font-semibold text-amber-800 hover:underline">
                    <Smartphone size={10} className="inline" /> {shop.hphone}
                  </a>
                )}
                {!shop.phone && !shop.hphone && <span className="text-gray-400">(없음)</span>}
              </div>
            </div>
          </div>

          {shop.area && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <MapPin size={10} /> {shop.area.replace(/,+$/, "")}
            </p>
          )}

          {/* admin 메모 + 승인/거절 (PENDING 만) */}
          {claim.status === "PENDING" ? (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="검토 메모 (승인/거절 시 같이 저장)"
                disabled={pending}
                rows={2}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 disabled:bg-gray-50"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={reject}
                  disabled={pending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors disabled:opacity-40"
                >
                  <X size={12} /> 거절
                </button>
                <button
                  type="button"
                  onClick={approve}
                  disabled={pending || !!shop.ownerId}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <Check size={12} /> 승인 (소유권 이양)
                </button>
              </div>
            </>
          ) : (
            claim.adminNote && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs">
                <p className="text-gray-500 mb-0.5">관리자 메모</p>
                <p className="text-gray-700 whitespace-pre-wrap">{claim.adminNote}</p>
              </div>
            )
          )}
        </div>
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
