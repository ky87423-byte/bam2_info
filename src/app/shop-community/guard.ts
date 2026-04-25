import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSiteConfig } from "@/lib/siteConfig";

/**
 * /shop-community/* 모든 페이지에서 호출하는 서버 가드.
 * 두 조건을 모두 만족하지 않으면 메인으로 redirect (notFound 가 아닌 redirect 로
 * "비공개 영역" 자체를 노출 안 함 — 비밀 게시판 정책).
 *
 * 1. SiteConfig.isShopCommunityActive === true
 * 2. session.user.role in ['shop', 'admin']
 *
 * @returns { userId, role } — 통과 시 호출자에게 정보 전달
 */
export async function requireShopCommunityAccess(): Promise<{ userId: number; role: "shop" | "admin"; nickname: string }> {
  const config = await getSiteConfig();
  if (!config.isShopCommunityActive) redirect("/");

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const role = session.user.role;
  if (role !== "shop" && role !== "admin") redirect("/");

  return {
    userId:   parseInt(session.user.id, 10),
    role:     role as "shop" | "admin",
    nickname: session.user.name ?? "",
  };
}
