import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;          // 마지막 항목은 href 없이 (현재 위치)
}

interface Props {
  items: BreadcrumbItem[];
}

/**
 * 게시판 상단 경로 표시 — 예: 홈 > 커뮤니티 > 후기게시판
 *
 *   <Breadcrumb items={[
 *     { label: "커뮤니티" },
 *     { label: "후기게시판", href: "/reviews" },
 *     { label: "글 제목" },                        // 마지막 항목 (현재 위치)
 *   ]} />
 */
export default function Breadcrumb({ items }: Props) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-gray-500 mb-3 flex-wrap">
      <Link href="/" className="inline-flex items-center gap-1 hover:text-yellow-600 transition-colors">
        <Home size={11} />
        홈
      </Link>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight size={11} className="text-gray-300" />
          {it.href && i < items.length - 1 ? (
            <Link href={it.href} className="hover:text-yellow-600 transition-colors">
              {it.label}
            </Link>
          ) : (
            <span className="text-gray-700 font-medium">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
