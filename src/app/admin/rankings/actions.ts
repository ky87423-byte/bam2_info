"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { updateSiteConfig } from "@/lib/siteConfig";
import { clearRankingCache } from "@/lib/actions/ranking";

export async function saveRankingExcludedAction(usernames: string[]) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false as const, error: "권한 없음" };
  await updateSiteConfig({ rankingExcludedUsernames: usernames });
  await clearRankingCache();
  revalidatePath("/admin/rankings");
  return { ok: true as const };
}
