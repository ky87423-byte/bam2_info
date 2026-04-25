"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InquiryStatus } from "@/generated/prisma/enums";

export type InquiryResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateInquiryStatusAction(
  inquiryId: number,
  status:    InquiryStatus,
  note?:     string,
): Promise<InquiryResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  await prisma.adminInquiry.update({
    where: { id: inquiryId },
    data:  {
      status,
      ...(note !== undefined ? { adminNote: note } : {}),
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/inquiries");
  return { ok: true };
}

export async function deleteInquiryAction(inquiryId: number): Promise<InquiryResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  await prisma.adminInquiry.delete({ where: { id: inquiryId } });
  revalidatePath("/admin/inquiries");
  return { ok: true };
}
