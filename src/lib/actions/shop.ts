"use server";

import { revalidatePath } from "next/cache";
import { updateShop, deleteShop, toggleShopVisibility } from "@/lib/data";
import { isAdminSession } from "./_authGuards";

export async function actionUpdateShop(formData: FormData) {
  if (!(await isAdminSession())) return;
  const id = parseInt(formData.get("id") as string, 10);
  if (!id) return;

  updateShop(id, {
    company: formData.get("company") as string,
    subject: formData.get("subject") as string,
    area: formData.get("area") as string,
    category: formData.get("category") as string,
    category2: formData.get("category2") as string,
    phone: formData.get("phone") as string,
    hphone: formData.get("hphone") as string,
    telegram: formData.get("telegram") as string,
    price: parseInt(formData.get("price") as string, 10) || 0,
    time1: formData.get("time1") as string,
    time2: formData.get("time2") as string,
    timeFull: formData.get("timeFull") === "on",
    isVisible: formData.get("isVisible") === "on",
  });

  revalidatePath("/admin/shops");
  revalidatePath(`/admin/shops/${id}`);
}

export async function actionDeleteShop(id: number) {
  if (!(await isAdminSession())) return;
  deleteShop(id);
  revalidatePath("/admin/shops");
}

export async function actionToggleShopVisibility(id: number) {
  if (!(await isAdminSession())) return;
  toggleShopVisibility(id);
  revalidatePath("/admin/shops");
  revalidatePath(`/admin/shops/${id}`);
}
