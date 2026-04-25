"use client";

import { useState, useTransition } from "react";
import { Phone, Smartphone, MapPin, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { updateInquiryStatusAction, deleteInquiryAction } from "@/lib/actions/inquiry";
import type { InquiryStatus } from "@/generated/prisma/enums";

interface Inquiry {
  id:         number;
  status:     InquiryStatus;
  content:    string;
  adminNote:  string;
  createdAt:  string;
  reviewedAt: string | null;
}

interface SenderInfo  { id: number; nickname: string; username: string; role: string; }
interface ShopInfo    { id: number; company: string; phone: string; hphone: string; area: string; }

const STATUS_COLOR: Record<string, string> = {
  NEW:       "bg-red-50 text-red-600 ring-red-200",
  REVIEWED:  "bg-blue-50 text-blue-600 ring-blue-200",
  FORWARDED: "bg-amber-50 text-amber-700 ring-amber-200",
  RESOLVED:  "bg-green-50 text-green-700 ring-green-200",
};
const STATUS_LABEL_KO: Record<string, string> = {
  NEW: "신규", REVIEWED: "확인", FORWARDED: "외부연락", RESOLVED: "완료",
};

export default function InquiryRow({
  inquiry, sender, shop,
}: {
  inquiry: Inquiry; sender: SenderInfo; shop: ShopInfo;
}) {
  const [open, setOpen]       = useState(false);
  const [note, setNote]       = useState(inquiry.adminNote);
  const [pending, startTrans] = useTransition();

  const updateStatus = (status: InquiryStatus) => {
    startTrans(async () => { await updateInquiryStatusAction(inquiry.id, status, note); });
  };
  const saveNote = () => {
    startTrans(async () => { await updateInquiryStatusAction(inquiry.id, inquiry.status, note); });
  };
  const handleDelete = () => {
    if (!confirm(`문의 #${inquiry.id} 영구 삭제하시겠습니까?`)) return;
    startTrans(async () => { await deleteInquiryAction(inquiry.id); });
  };

  return (
    <li className={["p-4 hover:bg-gray-50/60 transition-colors", pending && "opacity-50"].filter(Boolean).join(" ")}>
      {/* 한 줄 요약 */}
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left flex items-start gap-3">
        <span className={[
          "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full ring-1 font-bold shrink-0",
          STATUS_COLOR[inquiry.status],
        ].join(" ")}>
          {STATUS_LABEL_KO[inquiry.status]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">from</span>
            <span className="font-semibold text-gray-700 truncate">{sender.nickname}</span>
            <span className="text-gray-300">→</span>
            <span className="text-gray-400">to</span>
            <span className="font-semibold text-amber-700 truncate">{shop.company}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400 shrink-0">{formatDate(inquiry.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-600 truncate pl-12">{inquiry.content.slice(0, 100)}{inquiry.content.length > 100 ? "..." : ""}</p>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 mt-1" /> : <ChevronDown size={14} className="text-gray-400 mt-1" />}
      </button>

      {/* 펼쳐진 본문 + 액션 */}
      {open && (
        <div className="mt-3 pl-12 space-y-3">
          <div className="bg-white rounded-xl ring-1 ring-gray-100 px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{inquiry.content}</p>
          </div>

          {/* 업소 연락처 */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-gray-400">업소 연락처:</span>
            {shop.area && (
              <span className="inline-flex items-center gap-1 text-gray-600">
                <MapPin size={11} /> {shop.area.replace(/,+$/, "")}
              </span>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <Phone size={11} /> {shop.phone}
              </a>
            )}
            {shop.hphone && (
              <a href={`tel:${shop.hphone}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <Smartphone size={11} /> {shop.hphone}
              </a>
            )}
            {!shop.phone && !shop.hphone && (
              <span className="text-gray-400">(연락처 없음)</span>
            )}
          </div>

          {/* 메모 + 상태 변경 */}
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="외부 연락 결과·메모..."
              disabled={pending}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={saveNote}
              disabled={pending}
              className="self-stretch sm:self-end inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-gray-700 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40"
            >
              <Save size={11} /> 메모
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <div className="flex gap-1.5">
              {(["NEW", "REVIEWED", "FORWARDED", "RESOLVED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateStatus(s)}
                  disabled={pending || inquiry.status === s}
                  className={[
                    "px-2.5 py-1 rounded text-[10px] font-bold ring-1 transition-colors",
                    inquiry.status === s
                      ? STATUS_COLOR[s]
                      : "ring-gray-200 text-gray-400 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {STATUS_LABEL_KO[s]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded"
            >
              <Trash2 size={11} /> 삭제
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
