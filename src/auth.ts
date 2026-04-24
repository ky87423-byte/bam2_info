import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { getUserByUsername, updateUser, awardPoints, getSettings } from "@/lib/data";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "아이디" },
        password: { label: "비밀번호", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) return null;

        const user = getUserByUsername(credentials.username as string);
        if (!user || user.status === "blocked") return null;
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        // 일일 로그인 포인트 (당일 첫 로그인만)
        const today = new Date().toISOString().slice(0, 10);
        if (user.lastLoginDate !== today) {
          const settings = getSettings();
          awardPoints(user.id, "login", settings.pointLogin, "일일 로그인");
          updateUser(user.id, { lastLoginDate: today });
        }

        return {
          id: user.id.toString(),
          name: user.username,
          role: user.role ?? "user",
        };
      },
    }),
  ],
});
