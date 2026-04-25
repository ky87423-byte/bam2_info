import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Inbox, Filter } from "lucide-react";
import InquiryRow from "./InquiryRow";

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminInquiriesPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const params = await searchParams;
  const filter = (params.status ?? "ALL").toUpperCase();
  const page   = Math.max(1, parseInt(params.page ?? "1", 10));

  const where = filter === "ALL" || filter === "" ? {} : { status: filter as never };

  const [rows, total, statusCounts] = await Promise.all([
    prisma.adminInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        sender: { select: { id: true, nickname: true, username: true, role: true } },
        shop:   { select: { id: true, company: true, phone: true, hphone: true, area: true } },
      },
    }),
    prisma.adminInquiry.count({ where }),
    prisma.adminInquiry.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const counts: Record<string, number> = {};
  for (const c of statusCounts) counts[c.status] = c._count.id;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Inbox size={20} className="text-amber-500" />
        <h2 className="text-xl font-bold text-gray-800">업소 문의함</h2>
        <span className="text-xs text-gray-400 ml-2">전체 {total.toLocaleString()}건</span>
      </div>

      <p className="text-xs text-gray-500 mb-4 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
        💡 <strong>스크랩 업소(미등록)</strong>로 발송된 사용자 쪽지가 여기로 모입니다.
        업소 전화번호로 직접 연락 → 클레임 안내 → 영업 채널로 활용하세요.
      </p>

      {/* 상태 필터 탭 */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        <Filter size={13} className="text-gray-400 mr-1" />
        {(["ALL", "NEW", "REVIEWED", "FORWARDED", "RESOLVED"] as const).map((s) => (
          <a
            key={s}
            href={`/admin/inquiries?status=${s}`}
            className={[
              "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
              filter === s
                ? "bg-amber-100 text-amber-700"
                : "text-gray-500 hover:bg-gray-100",
            ].join(" ")}
          >
            {STATUS_LABEL[s]}
            {s !== "ALL" && counts[s] > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({counts[s]})</span>
            )}
          </a>
        ))}
      </div>

      {/* 목록 */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          {filter === "ALL" ? "문의가 없습니다." : `${STATUS_LABEL[filter as keyof typeof STATUS_LABEL] ?? filter} 상태의 문의가 없습니다.`}
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {rows.map((r) => (
            <InquiryRow
              key={r.id}
              inquiry={{
                id:         r.id,
                status:     r.status,
                content:    r.content,
                adminNote:  r.adminNote,
                createdAt:  r.createdAt.toISOString(),
                reviewedAt: r.reviewedAt?.toISOString() ?? null,
              }}
              sender={{ id: r.sender.id, nickname: r.sender.nickname, username: r.sender.username, role: String(r.sender.role).toLowerCase() }}
              shop={{   id: r.shop.id,   company: r.shop.company, phone: r.shop.phone, hphone: r.shop.hphone, area: r.shop.area }}
            />
          ))}
        </ul>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{page} / {totalPages} 페이지</span>
          <div className="flex gap-1">
            {page > 1 && (
              <a href={`/admin/inquiries?status=${filter}&page=${page - 1}`}
                 className="px-3 py-1 rounded hover:bg-gray-100">이전</a>
            )}
            {page < totalPages && (
              <a href={`/admin/inquiries?status=${filter}&page=${page + 1}`}
                 className="px-3 py-1 rounded hover:bg-gray-100">다음</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL = {
  ALL:       "전체",
  NEW:       "신규",
  REVIEWED:  "확인됨",
  FORWARDED: "외부연락",
  RESOLVED:  "처리완료",
} as const;
