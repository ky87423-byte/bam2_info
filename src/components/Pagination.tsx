"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  total: number;
  page: number;
  pageSize: number;
}

export default function Pagination({ total, page, pageSize }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function go(p: number) {
    const np = new URLSearchParams(params.toString());
    np.set("page", String(p));
    router.push(`/?${np.toString()}`);
  }

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 text-sm disabled:opacity-40 hover:bg-gray-200"
      >
        이전
      </button>
      {start > 1 && (
        <>
          <button onClick={() => go(1)} className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">1</button>
          {start > 2 && <span className="px-2 text-gray-400">...</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          className={`px-3 py-1.5 rounded text-sm ${
            p === page ? "bg-yellow-400 text-black font-bold" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-2 text-gray-400">...</span>}
          <button onClick={() => go(totalPages)} className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 text-sm disabled:opacity-40 hover:bg-gray-200"
      >
        다음
      </button>
    </div>
  );
}
