import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShieldCheck, Filter } from "lucide-react";
import ClaimRow from "./ClaimRow";

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminClaimsPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const params = await searchParams;
  const filter = (params.status ?? "PENDING").toUpperCase();
  const page   = Math.max(1, parseInt(params.page ?? "1", 10));

  const where = filter === "ALL" || filter === "" ? {} : { status: filter as never };

  const [rows, total, statusCounts] = await Promise.all([
    prisma.claimRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        claimant: { select: { id: true, nickname: true, username: true, role: true } },
        shop:     { select: { id: true, company: true, phone: true, hphone: true, area: true, ownerId: true } },
      },
    }),
    prisma.claimRequest.count({ where }),
    prisma.claimRequest.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const counts: Record<string, number> = {};
  for (const c of statusCounts) counts[c.status] = c._count.id;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck size={20} className="text-amber-500" />
        <h2 className="text-xl font-bold text-gray-800">소유권 주장 신청</h2>
        <span className="text-xs text-gray-400 ml-2">전체 {total.toLocaleString()}건</span>
      </div>

      <div className="flex items-center gap-1 mb-4 flex-wrap">
        <Filter size={13} className="text-gray-400 mr-1" />
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <a
            key={s}
            href={`/admin/claims?status=${s}`}
            className={[
              "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
              filter === s ? "bg-amber-100 text-amber-700" : "text-gray-500 hover:bg-gray-100",
            ].join(" ")}
          >
            {STATUS_LABEL_KO[s]}
            {s !== "ALL" && counts[s] > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({counts[s]})</span>
            )}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-sm text-gray-400">
          신청이 없습니다.
        </div>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {rows.map((r) => (
            <ClaimRow
              key={r.id}
              claim={{
                id:           r.id,
                status:       r.status,
                proofText:    r.proofText,
                contactPhone: r.contactPhone,
                adminNote:    r.adminNote,
                createdAt:    r.createdAt.toISOString(),
                reviewedAt:   r.reviewedAt?.toISOString() ?? null,
              }}
              claimant={{ id: r.claimant.id, nickname: r.claimant.nickname, username: r.claimant.username, role: String(r.claimant.role).toLowerCase() }}
              shop={{ id: r.shop.id, company: r.shop.company, phone: r.shop.phone, hphone: r.shop.hphone, area: r.shop.area, ownerId: r.shop.ownerId }}
            />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{page} / {totalPages} 페이지</span>
          <div className="flex gap-1">
            {page > 1 && (
              <a href={`/admin/claims?status=${filter}&page=${page - 1}`} className="px-3 py-1 rounded hover:bg-gray-100">이전</a>
            )}
            {page < totalPages && (
              <a href={`/admin/claims?status=${filter}&page=${page + 1}`} className="px-3 py-1 rounded hover:bg-gray-100">다음</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL_KO = {
  ALL:      "전체",
  PENDING:  "대기",
  APPROVED: "승인",
  REJECTED: "거절",
} as const;
