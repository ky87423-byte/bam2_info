import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { getUserByUsername, updateUser, awardPoints, getSettings } from "@/lib/data";

const isDev = process.env.NODE_ENV === "development";

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

        const user = await getUserByUsername(credentials.username as string);
        if (!user || user.status === "blocked") return null;
        if (user.isVirtual) return null;     // 가상 계정 로그인 차단 (이중 방어)
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        // 일일 로그인 포인트 (당일 첫 로그인만)
        const today = new Date().toISOString().slice(0, 10);
        if (user.lastLoginDate !== today) {
          const settings = getSettings();
          await awardPoints(user.id, "login", settings.pointLogin, "일일 로그인");
          await updateUser(user.id, { lastLoginDate: today });
        }

        return {
          id: user.id.toString(),
          name: user.username,
          role: user.role ?? "user",
        };
      },
    }),
    // ── DEV ONLY: 비밀번호 검증 우회 (로컬 테스트 전용) ──
    // production 빌드에서는 authorize 가 항상 null 을 반환하여 무력화됨.
    ...(isDev
      ? [
          Credentials({
            id: "dev-bypass",
            name: "DevBypass",
            credentials: { username: {} },
            authorize: async (credentials) => {
              if (process.env.NODE_ENV !== "development") return null;
              if (!credentials?.username) return null;
              const user = await getUserByUsername(credentials.username as string);
              if (!user) return null;
              return {
                id: user.id.toString(),
                name: user.username,
                role: user.role ?? "user",
              };
            },
          }),
        ]
      : []),
  ],
});
