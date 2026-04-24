import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        if (auth.user.role !== "admin") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (pathname.startsWith("/shop")) {
        if (!isLoggedIn) return false;
        const role = auth.user.role;
        if (role !== "shop" && role !== "admin") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn && (pathname.startsWith("/mypage") || pathname === "/attend/checkin")) {
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if ((user as { role?: string })?.role) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      return session;
    },
  },
  providers: [],
  session: { strategy: "jwt" },
};
