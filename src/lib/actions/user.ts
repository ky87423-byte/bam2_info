"use server";

import { revalidatePath } from "next/cache";
import { updateUser, deleteUser } from "@/lib/data";

export async function actionUpdateUser(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  if (!id) return;

  const shopPostLimit = parseInt(formData.get("shopPostLimit") as string, 10);
  const newStatus = formData.get("status") as "active" | "blocked";
  const prevStatus = formData.get("prevStatus") as "active" | "blocked";
  const today = new Date().toISOString().slice(0, 10);

  const statusDates: { approvedAt?: string; blockedAt?: string } = {};
  if (newStatus !== prevStatus) {
    if (newStatus === "active") statusDates.approvedAt = today;
    if (newStatus === "blocked") statusDates.blockedAt = today;
  }

  updateUser(id, {
    username: formData.get("username") as string,
    nickname: formData.get("nickname") as string,
    level: parseInt(formData.get("level") as string, 10) || 1,
    points: parseInt(formData.get("points") as string, 10) || 0,
    status: newStatus,
    role: formData.get("role") as "admin" | "shop" | "user",
    shopPostLimit: isNaN(shopPostLimit) ? 3 : Math.min(10, Math.max(1, shopPostLimit)),
    memo: formData.get("memo") as string,
    ...statusDates,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}

export async function actionDeleteUser(id: number) {
  deleteUser(id);
  revalidatePath("/admin/users");
}

export async function actionToggleUserStatus(id: number, status: "active" | "blocked") {
  updateUser(id, { status });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}
