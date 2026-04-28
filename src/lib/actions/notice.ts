"use server";

import { revalidatePath } from "next/cache";
import { createNotice, updateNotice, deleteNotice, saveSettings } from "@/lib/data";
import { isAdminSession } from "./_authGuards";

function parseBoardCategory(raw: string | null): "" | "free" | "jobs" {
  return raw === "free" || raw === "jobs" ? raw : "";
}

export async function actionCreateNotice(formData: FormData) {
  if (!(await isAdminSession())) return;
  const boardCategory = parseBoardCategory(formData.get("boardCategory") as string | null);
  createNotice({
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    isPinned: formData.get("isPinned") === "on",
    isVisible: true,
    boardCategory,
  });
  revalidatePath("/admin/boards");
  if (boardCategory) revalidatePath(`/${boardCategory}`);
}

export async function actionUpdateNotice(formData: FormData) {
  if (!(await isAdminSession())) return;
  const id = parseInt(formData.get("id") as string, 10);
  if (!id) return;
  const boardCategory = parseBoardCategory(formData.get("boardCategory") as string | null);
  updateNotice(id, {
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    isPinned: formData.get("isPinned") === "on",
    isVisible: formData.get("isVisible") === "on",
    boardCategory,
  });
  revalidatePath("/admin/boards");
  // 변경 전/후 카테고리 둘 다 invalidate
  revalidatePath("/free");
  revalidatePath("/jobs");
}

export async function actionDeleteNotice(id: number) {
  if (!(await isAdminSession())) return;
  deleteNotice(id);
  revalidatePath("/admin/boards");
}

export async function actionSaveBoardPermissions(formData: FormData) {
  if (!(await isAdminSession())) return;
  const cb = (key: string) => formData.get(key) === "on";
  saveSettings({
    boardPermissions: {
      read:  { guest: cb("read_guest"),  user: cb("read_user"),  shop: cb("read_shop")  },
      write: { guest: cb("write_guest"), user: cb("write_user"), shop: cb("write_shop") },
      edit:  { guest: cb("edit_guest"),  user: cb("edit_user"),  shop: cb("edit_shop")  },
    },
  });
  revalidatePath("/admin/boards");
}
