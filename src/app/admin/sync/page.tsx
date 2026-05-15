import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RefreshCw, Database, FileJson, Users, ShieldCheck, Hash, Eye, EyeOff, Trash2, Archive } from "lucide-react";
import { getSyncStatus } from "@/lib/actions/sync";
import SyncRunButton from "./SyncRunButton";
import VisibilitySyncButton from "./VisibilitySyncButton";

export default async function AdminSyncPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const status = await getSyncStatus();

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <RefreshCw size={20} className="text-indigo-500" />
        <h2 className="text-xl font-bold text-gray-800">데이터 동기화</h2>
      </div>

      <p className="text-xs text-gray-500 mb-5 leading-relaxed bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
        💡 스크래퍼가 생성한 <code className="bg-white px-1 rounded">scraped_data/shops.json</code>{" "}
        파일을 읽어 <code className="bg-white px-1 rounded">externalId</code> 기준 스마트 upsert 합니다.
        <br />· 신규 글 → 새로 생성 + 가상 user 자동 연결 · 기존 글 → 변경된 필드만 갱신
      </p>

      {/* 현황 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Database}     label="전체 업소"     value={status.totalShops.toLocaleString()}     color="bg-blue-500" />
        <StatCard icon={FileJson}     label="스크랩 출처"   value={status.scrapedShops.toLocaleString()}   color="bg-indigo-500" />
        <StatCard icon={Hash}         label="externalId 보유" value={status.withExternalId.toLocaleString()} color="bg-amber-500" />
        <StatCard icon={Users}        label="가상 user 연결" value={status.virtualShops.toLocaleString()}   color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={ShieldCheck}  label="클레임된 업소"  value={status.ownedShops.toLocaleString()}     color="bg-green-500" />
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="bg-gray-500 text-white p-2.5 rounded-xl shrink-0">
            <RefreshCw size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">마지막 동기화</p>
            <p className="text-base font-bold text-gray-800 leading-tight">
              {status.lastScrapedAt
                ? new Date(status.lastScrapedAt).toLocaleString("ko-KR")
                : <span className="text-gray-400">아직 없음</span>}
            </p>
          </div>
        </div>
      </div>

      {/* 소스 가시성 상태 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700">소스 사이트 가시성</h3>
          {status.lastSeenInListAt && (
            <span className="text-[11px] text-gray-400">
              마지막 목록 관측: {new Date(status.lastSeenInListAt).toLocaleString("ko-KR")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Eye}      label="ACTIVE"            value={status.bySourceStatus.ACTIVE.toLocaleString()}            color="bg-green-500" />
          <StatCard icon={EyeOff}   label="MISSING"           value={status.bySourceStatus.MISSING.toLocaleString()}           color="bg-amber-500" />
          <StatCard icon={Trash2}   label="DELETED_CONFIRMED" value={status.bySourceStatus.DELETED_CONFIRMED.toLocaleString()} color="bg-red-500"   />
          <StatCard icon={Archive}  label="ARCHIVED"          value={status.bySourceStatus.ARCHIVED.toLocaleString()}          color="bg-gray-500"  />
        </div>
      </div>

      {/* 수동 동기화 버튼 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">수동 전체 동기화 (shops.json → DB)</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          shops.json 의 모든 row 를 읽어 externalId 기준 upsert. 4,000건 기준 약 30~60초 소요.
          <br />
          진행 중에는 페이지를 닫지 마세요. 완료 후 통계가 자동 갱신됩니다.
        </p>
        <SyncRunButton />
      </div>

      {/* 가시성 동기화 버튼 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">가시성 동기화 (urls.json ↔ DB)</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          스크래퍼가 수집한 현재 소스 목록(urls.json)과 DB를 대조해 각 업소의 노출 상태를 갱신합니다.
          <br />
          · 목록에 보임 → <b>ACTIVE</b> (missingStreak 리셋)
          <br />
          · 목록에서 사라짐 → <b>MISSING</b> (streak +1), 3회+ & 30일+ → <b>ARCHIVED</b>
        </p>
        <VisibilitySyncButton />
      </div>

      {/* 자동 스케줄러 안내 */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4">
        <h3 className="font-semibold text-xs text-gray-600 mb-1.5">📅 자동 동기화 (Cron) 설정 안내</h3>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          매일 새벽 4시 자동 실행을 원하면 외부 스케줄러(GitHub Actions, cron, Vercel Cron 등)에서{" "}
          <code className="bg-white px-1 rounded">POST /api/admin/sync</code> 를 호출하세요.{" "}
          관리자 세션 쿠키 또는 별도 인증 토큰 헤더(<code>X-Sync-Key</code>) 필요.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <div className={`${color} text-white p-2.5 rounded-xl shrink-0`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}
