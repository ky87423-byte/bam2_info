import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserById } from "@/lib/data";
import { ChevronLeft } from "lucide-react";
import UserEditForm from "./UserEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getUserById(parseInt(id, 10));
  if (!user) notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft size={16} /> 목록으로
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{user.username}</span>
      </div>
      <UserEditForm user={user} />
    </div>
  );
}
