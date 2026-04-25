import { notFound } from "next/navigation";
import Link from "next/link";
import { getShopPostById } from "@/lib/data";
import { MapPin, Tag, Phone, Smartphone, MessageCircle, Clock, ChevronLeft, DollarSign } from "lucide-react";
import CommentSection from "@/components/comments/CommentSection";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getShopPostById(parseInt(id));

  if (!post || post.status !== "approved") notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft size={16} />
        목록으로
      </Link>

      {/* 대표사진 */}
      {post.mainPhoto && (
        <div className="rounded-2xl overflow-hidden mb-6 aspect-video bg-gray-100">
          <img src={post.mainPhoto} alt={post.company} className="w-full h-full object-cover" />
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{post.company}</h1>
        {post.subject && <p className="text-gray-500 mt-1">{post.subject}</p>}

        <div className="flex flex-wrap gap-3 mt-4">
          {post.area && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
              <MapPin size={14} className="text-blue-500" /> {post.area}
            </span>
          )}
          {post.category && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Tag size={14} className="text-green-500" /> {post.category}
              {post.category2 && ` · ${post.category2}`}
            </span>
          )}
          {(post.timeFull || (post.time1 && post.time2)) && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Clock size={14} className="text-purple-500" />
              {post.timeFull ? "24시간 영업" : `${post.time1} ~ ${post.time2}`}
            </span>
          )}
          {post.price != null && post.price > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
              <DollarSign size={14} /> {post.price.toLocaleString()}원~
            </span>
          )}
        </div>
      </div>

      {/* 연락처 */}
      {(post.phone || post.hphone || post.telegram) && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">연락처</h2>
          <div className="space-y-2">
            {post.phone && (
              <a href={`tel:${post.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors">
                <Phone size={15} className="text-gray-400" /> {post.phone}
              </a>
            )}
            {post.hphone && (
              <a href={`tel:${post.hphone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition-colors">
                <Smartphone size={15} className="text-gray-400" /> {post.hphone}
              </a>
            )}
            {post.telegram && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <MessageCircle size={15} className="text-blue-400" /> {post.telegram}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 소개글 */}
      {post.content && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">업소 소개</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* 추가 사진 */}
      {post.photos && post.photos.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">사진 ({post.photos.length})</h2>
          <div className="grid grid-cols-3 gap-2">
            {post.photos.map((url, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={url} alt={`${post.company} ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 댓글 섹션 (홍보 게시판: targetType="promotion") ── */}
      <CommentSection boardType="promotion" postId={post.id} />
    </div>
  );
}
