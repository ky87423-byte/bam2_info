"use server";

import { revalidatePath } from "next/cache";
import { saveSettings } from "@/lib/data";

export async function actionSaveSettings(formData: FormData) {
  saveSettings({
    siteName: formData.get("siteName") as string,
    siteDescription: formData.get("siteDescription") as string,
    logoUrl: formData.get("logoUrl") as string,
    popupEnabled: formData.get("popupEnabled") === "on",
    popupContent: formData.get("popupContent") as string,
    blockedIps: ((formData.get("blockedIps") as string) ?? "")
      .split("\n")
      .map((ip) => ip.trim())
      .filter(Boolean),
    maintenanceMode: formData.get("maintenanceMode") === "on",
    // 포인트 설정
    pointSignup: parseInt(formData.get("pointSignup") as string, 10) || 0,
    pointLogin: parseInt(formData.get("pointLogin") as string, 10) || 0,
    pointAttend: parseInt(formData.get("pointAttend") as string, 10) || 0,
    pointAttendStreakBonus: parseInt(formData.get("pointAttendStreakBonus") as string, 10) || 0,
    pointPost: parseInt(formData.get("pointPost") as string, 10) || 0,
    pointComment: parseInt(formData.get("pointComment") as string, 10) || 0,
  });
  revalidatePath("/admin/settings");
  revalidatePath("/");
}
