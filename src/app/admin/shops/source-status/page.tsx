import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Eye, EyeOff, Trash2, Archive, ExternalLink } from "lucide-react";
import { listShopsBySourceStatus, type ShopRow } from "@/lib/actions/source-status";
import StatusActionButtons from "./StatusActionButtons";
import BulkMarkButton from "./BulkMarkButton";

type Status = "ACTIVE" | "MISSING" | "DELETED_CONFIRMED" | "ARCHIVED";

const TABS: Array<{ key: Status; label: string; icon: React.ElementType; color: string }> = [
  { key: "MISSING",            label: "MISSING (목록에서 사라짐)",   icon: EyeOff,  color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "DELETED_CONFIRMED",  label: "DELETED (삭제 확인)",         icon: Trash2,  color: "text-red-600 bg-red-50 border-red-200"     },
  { key: "ARCHIVED",           label: "ARCHIVED (장기 미관측)",      icon: Archive, color: "text-gray-600 bg-gray-50 border-gray-200"   },
  { key: "ACTIVE",             label: "ACTIVE (정상)",               icon: Eye,     color: "text-green-600 bg-green-50 border-green-200" },
];

export default async function SourceStatusPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const sp = await searchParams;
  const status = (TABS.find((t) => t.key === sp.status)?.key ?? "MISSING") as Status;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 50;

  const { rows, total } = await listShopsBySourceStatus(status, page, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">소스 상태 관리</h2>
        {status === "MISSING" && <BulkMarkButton currentCount={total} />}
      </div>

      <p className="text-xs text-gray-500 mb-4 leading-relaxed bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
        💡 스크래퍼 목록(urls.json) ↔ DB 대조 결과 상태별 분류.
        <br />
        · MISSING: 한 번 이상 목록에 안 보임 (false positive 가능 — <code className="bg-white px-1 rounded">verify-missing.ts</code> 검증 권장)
        <br />
        · DELETED_CONFIRMED: 검증 완료 또는 수동 확인. <b>공개 페이지에서 숨김</b>.
        <br />
        · ARCHIVED: 30일+ 3회+ 미관측. <b>공개 페이지에서 숨김</b>.
      </p>

      {/* 탭 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.key === status;
          return (
            <Link
              key={t.key}
              href={`/admin/shops/source-status?status=${t.key}`}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border",
                active ? t.color + " ring-2 ring-offset-1" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              <Icon size={13} />
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* 리스트 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b text-xs text-gray-500 flex justify-between">
          <span>{status} · 전체 <b className="text-gray-700">{total.toLocaleString()}</b>건</span>
          <span>page {page} / {totalPages}</span>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">해당 상태 업소가 없습니다.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">wr_id</th>
                <th className="px-3 py-2 text-left font-medium">업소명</th>
                <th className="px-3 py-2 text-left font-medium">지역</th>
                <th className="px-3 py-2 text-center font-medium">streak</th>
                <th className="px-3 py-2 text-left font-medium">마지막 관측</th>
                <th className="px-3 py-2 text-right font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => <ShopRowItem key={row.id} row={row} />)}
            </tbody>
          </table>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 border-t">
            {page > 1 && (
              <Link
                href={`/admin/shops/source-status?status=${status}&page=${page - 1}`}
                className="px-3 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
              >
                ← 이전
              </Link>
            )}
            <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
            {page < totalPages && (
              <Link
                href={`/admin/shops/source-status?status=${status}&page=${page + 1}`}
                className="px-3 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
              >
                다음 →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopRowItem({ row }: { row: ShopRow }) {
  const externalUrl = row.externalId
    ? `https://opga037.com/bbs/board.php?bo_table=op_partner_posting&wr_id=${row.externalId}`
    : null;
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 font-mono text-gray-500">
        {externalUrl ? (
          <a href={externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            {row.externalId}
            <ExternalLink size={10} />
          </a>
        ) : <span>—</span>}
      </td>
      <td className="px-3 py-2 truncate max-w-[220px]" title={row.company}>{row.company}</td>
      <td className="px-3 py-2 text-gray-500">{row.area.replace(/,$/, "")}</td>
      <td className="px-3 py-2 text-center text-gray-600">{row.missingStreak}</td>
      <td className="px-3 py-2 text-gray-500">
        {row.lastSeenInListAt ? new Date(row.lastSeenInListAt).toLocaleString("ko-KR") : "—"}
      </td>
      <td className="px-3 py-2 text-right">
        <StatusActionButtons shopId={row.id} currentStatus={row.sourceStatus} />
      </td>
    </tr>
  );
}
