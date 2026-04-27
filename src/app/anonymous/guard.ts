import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * /anonymous 의 작성/수정/상세 본문 노출 가드.
 * 비회원도 목록 페이지의 제목은 볼 수 있어야 하므로 list 에서는 호출하지 않음.
 */
export async function requireLogin(callbackUrl: string): Promise<{ userId: number; role: string; nickname: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return {
    userId:   parseInt(session.user.id, 10),
    role:     session.user.role ?? "user",
    nickname: session.user.name ?? "",
  };
}
