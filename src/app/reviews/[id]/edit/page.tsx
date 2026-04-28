import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { ChevronLeft, Pencil } from "lucide-react";
import { getReviewById, REVIEW_BIZ_TYPES, REVIEW_TAG_PRESET } from "@/lib/data";
import ReviewForm from "../../ReviewForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditReviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const reviewId = parseInt(id, 10);
  if (isNaN(reviewId)) notFound();

  const review = getReviewById(reviewId);
  if (!review) notFound();

  const userId  = parseInt(session.user.id);
  const isAdmin = session.user.role === "admin";
  if (review.authorId !== userId && !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">본인의 후기만 수정할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/reviews/${review.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-yellow-600 mb-4">
        <ChevronLeft size={14} /> 후기 보기
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <Pencil size={22} className="text-yellow-600" />
        <h1 className="text-xl font-bold text-gray-800">후기 수정</h1>
      </div>
      <ReviewForm
        mode="edit"
        bizTypes={[...REVIEW_BIZ_TYPES]}
        tagPresets={[...REVIEW_TAG_PRESET]}
        defaultValues={review}
      />
    </div>
  );
}
