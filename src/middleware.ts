import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/mypage/:path*", "/attend/checkin", "/admin", "/admin/:path*", "/shop", "/shop/:path*"],
};
