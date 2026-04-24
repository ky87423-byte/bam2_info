"use client";

import { Phone, Send } from "lucide-react";

interface Props {
  storeId: number;
  phone?: string;
  hphone?: string;
  telegram?: string;
}

async function track(storeId: number, eventType: "CALL" | "MAP" | "RESERVATION") {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, eventType }),
    });
  } catch {
    // 트래킹 실패는 UX에 영향 주지 않음
  }
}

export default function ContactButtons({ storeId, phone, hphone, telegram }: Props) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      {phone && (
        <a
          href={`tel:${phone.replace(/\D/g, "")}`}
          onClick={() => track(storeId, "CALL")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Phone size={18} />
          <span className="font-semibold">{phone}</span>
        </a>
      )}
      {hphone && hphone !== phone && (
        <a
          href={`tel:${hphone.replace(/\D/g, "")}`}
          onClick={() => track(storeId, "CALL")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Phone size={18} />
          <span className="font-semibold">{hphone}</span>
        </a>
      )}
      {telegram && (
        <a
          href={`https://t.me/${telegram.replace("@", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track(storeId, "CALL")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
        >
          <Send size={18} />
          <span className="font-semibold">{telegram}</span>
        </a>
      )}
    </div>
  );
}
