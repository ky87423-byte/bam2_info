"use server";

import { revalidatePath } from "next/cache";
import { createNotice, updateNotice, deleteNotice, saveSettings } from "@/lib/data";

export async function actionCreateNotice(formData: FormData) {
  createNotice({
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    isPinned: formData.get("isPinned") === "on",
    isVisible: true,
  });
  revalidatePath("/admin/boards");
}

export async function actionUpdateNotice(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  if (!id) return;
  updateNotice(id, {
    title: formData.get("title") as string,
    content: formData.get("content") as string,
    isPinned: formData.get("isPinned") === "on",
    isVisible: formData.get("isVisible") === "on",
  });
  revalidatePath("/admin/boards");
}

export async function actionDeleteNotice(id: number) {
  deleteNotice(id);
  revalidatePath("/admin/boards");
}

export async function actionSaveBoardPermissions(formData: FormData) {
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
