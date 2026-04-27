"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function MyCouponCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="클릭해서 복사"
      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-mono transition-colors"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {code}
    </button>
  );
}
