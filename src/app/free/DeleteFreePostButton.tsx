"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBoardPostAction } from "@/lib/actions/boardPost";

export default function DeleteFreePostButton({ postId }: { postId: number }) {
  const [pending, startTrans] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    startTrans(async () => {
      await deleteBoardPostAction(postId);
      router.push("/free");
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
    >
      <Trash2 size={11} /> 삭제
    </button>
  );
}
