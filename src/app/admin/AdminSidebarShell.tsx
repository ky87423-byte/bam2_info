"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

/**
 * Admin 사이드바 wrapper:
 *   - lg↑ : 좌측 고정 사이드바 (w-56)
 *   - lg 미만: 햄버거 토글 → drawer 노출
 *   children = 사이드바 내용 (BAM Admin 헤더 + 메뉴들)
 *   topbarRight = 모바일에서 햄버거 옆에 보일 우측 액션 (선택)
 */
export default function AdminSidebarShell({
  children,
  pageTitle,
  username,
  rightSlot,
  mainContent,
}: {
  children:    ReactNode;       // 사이드바 nav 컨텐츠
  pageTitle:   string;
  username:    string;
  rightSlot:   ReactNode;       // header 우측 (로그아웃 폼 등)
  mainContent: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* ── 데스크톱 사이드바 (lg↑ 만 노출) ── */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-[#1a1a2e] text-white flex-col">
        {children}
      </aside>

      {/* ── 모바일 drawer (lg 미만) ── */}
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
          <aside className="lg:hidden fixed top-0 bottom-0 left-0 w-64 bg-[#1a1a2e] text-white flex flex-col z-50 shadow-2xl overflow-y-auto">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="메뉴 닫기"
              className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10"
            >
              <X size={16} />
            </button>
            <div onClick={() => setOpen(false)}>
              {children}
            </div>
          </aside>
        </>
      )}

      {/* ── 본문 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm gap-3">
          {/* 모바일 햄버거 (lg 미만) */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded text-gray-600 hover:bg-gray-100"
          >
            <Menu size={18} />
          </button>
          <h1 className="text-sm font-semibold text-gray-600 flex-1 truncate">{pageTitle}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-gray-500">{username}</span>
            {rightSlot}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{mainContent}</main>
      </div>
    </div>
  );
}
