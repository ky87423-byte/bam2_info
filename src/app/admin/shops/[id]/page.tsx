import { notFound } from "next/navigation";
import Link from "next/link";
import { getShopById } from "@/lib/data";
import { ChevronLeft } from "lucide-react";
import ShopEditForm from "./ShopEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminShopDetailPage({ params }: Props) {
  const { id } = await params;
  const shop = getShopById(parseInt(id, 10));
  if (!shop) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/shops" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft size={16} /> 목록으로
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{shop.company}</span>
      </div>
      <ShopEditForm shop={shop} />
    </div>
  );
}
