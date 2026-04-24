import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "BAM - 업소 정보",
  description: "지역별 업소 정보 검색",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSans.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-[family-name:var(--font-noto)]">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="bg-[#1a1a2e] text-white/50 text-xs text-center py-4 mt-8">
          © 2024 BAM. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
