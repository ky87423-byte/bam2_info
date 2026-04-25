import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // /shop/[id] (스크랩 업소 공개 상세) 는 매처에서 제외 → 누구나 열람 가능.
  // 자기 관리 페이지(dashboard, post)만 보호.
  matcher: [
    "/mypage/:path*",
    "/attend/checkin",
    "/admin", "/admin/:path*",
    "/shop",                       // /shop 진입(→ dashboard로 redirect) 보호
    "/shop/dashboard/:path*",
    "/shop/post/:path*",
  ],
};
