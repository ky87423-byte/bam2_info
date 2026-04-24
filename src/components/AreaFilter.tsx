"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  areas: string[];
}

export default function AreaFilter({ areas }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("area") ?? "";

  function select(area: string) {
    const p = new URLSearchParams(params.toString());
    if (area) p.set("area", area);
    else p.delete("area");
    p.delete("page");
    router.push(`/?${p.toString()}`);
  }

  return (
    <div className="flex gap-2 flex-wrap pb-2">
      <button
        onClick={() => select("")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !current
            ? "bg-yellow-400 text-black"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        전체
      </button>
      {areas.map((area) => (
        <button
          key={area}
          onClick={() => select(area)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            current === area
              ? "bg-yellow-400 text-black"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {area}
        </button>
      ))}
    </div>
  );
}
