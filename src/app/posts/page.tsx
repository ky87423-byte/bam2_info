import Link from "next/link";
import { getShopPosts } from "@/lib/data";
import { MapPin, Tag, Phone, Clock, ImageIcon } from "lucide-react";

interface Props {
  searchParams: Promise<{ area?: string; category?: string; q?: string; author?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function PostsPage({ searchParams }: Props) {
  const params   = await searchParams;
  const area     = params.area     ?? "";
  const category = params.category ?? "";
  const q        = params.q        ?? "";
  const author   = params.author   ?? "";
  const page     = Math.max(1, parseInt(params.page ?? "1", 10));

  const { posts: allPosts } = getShopPosts({ status: "approved" });

  let filtered = allPosts;
  if (area)     filtered = filtered.filter((p) => p.area === area);
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (author)   filtered = filtered.filter((p) => p.authorUsername === author);
  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter((p) =>
      p.company.toLowerCase().includes(lq) ||
      (p.subject ?? "").toLowerCase().includes(lq) ||
      (p.area ?? "").toLowerCase().includes(lq)
    );
  }

  const total      = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const posts      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const areas      = [...new Set(allPosts.map((p) => p.area).filter((a): a is string => !!a))].sort();
  const categories = [...new Set(allPosts.map((p) => p.category).filter((c): c is string => !!c))].sort();

  const buildUrl = (overrides: Record<string, string>) => {
    const p: Record<string, string> = { area, category, q, author, ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/posts${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">업소 게시글</h1>
        <span className="text-sm text-gray-500">총 {total}건</span>
      </div>

      {/* 검색 / 필터 — 모두 GET 폼으로 처리 */}
      <form method="GET" action="/posts" className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="업소명 검색..."
          className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        <select
          name="area"
          defaultValue={area}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">전체 지역</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          name="category"
          defaultValue={category}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400"
        >
          <option value="">전체 업종</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">검색</button>
        {(area || category || q) && (
          <Link href="/posts" className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors">
            초기화
          </Link>
        )}
      </form>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
          {(area || category || q) ? "검색 결과가 없습니다." : "아직 등록된 업소 게시글이 없습니다."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {post.mainPhoto ? (
                  <img
                    src={post.mainPhoto}
                    alt={post.company}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon size={32} />
                  </div>
                )}
                {post.photos && post.photos.length > 1 && (
                  <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                    +{post.photos.length - 1}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-800 truncate">{post.company}</h2>
                {post.subject && <p className="text-xs text-gray-500 truncate mt-0.5">{post.subject}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {post.area && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={11} />{post.area}
                    </span>
                  )}
                  {post.category && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Tag size={11} />{post.category}
                    </span>
                  )}
                  {(post.phone || post.hphone) && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone size={11} />{post.phone || post.hphone}
                    </span>
                  )}
                  {post.timeFull && (
                    <span className="flex items-center gap-1 text-xs text-blue-500">
                      <Clock size={11} />24시간
                    </span>
                  )}
                </div>
                {post.price != null && post.price > 0 && (
                  <p className="text-sm font-bold text-blue-600 mt-2">{post.price.toLocaleString()}원~</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-6">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">이전</Link>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <Link key={p} href={buildUrl({ page: String(p) })}
                className={`px-3 py-1.5 border rounded text-sm ${p === page ? "bg-blue-500 text-white border-blue-500" : "bg-white hover:bg-gray-50"}`}>
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 bg-white border rounded text-sm hover:bg-gray-50">다음</Link>
          )}
        </div>
      )}
    </div>
  );
}
