import { getSettings } from "@/lib/data";
import { actionSaveSettings } from "@/lib/actions/settings";
import { Settings, Coins } from "lucide-react";

export default function AdminSettingsPage() {
  const s = getSettings();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={20} className="text-gray-600" />
        <h2 className="text-xl font-bold text-gray-800">사이트 설정</h2>
      </div>

      <form action={actionSaveSettings} className="space-y-4">
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <Field label="사이트명" name="siteName" defaultValue={s.siteName} />
          <Field label="사이트 설명" name="siteDescription" defaultValue={s.siteDescription} className="mt-3" />
          <Field label="로고 URL" name="logoUrl" defaultValue={s.logoUrl} placeholder="https://..." className="mt-3" />
        </Section>

        {/* 포인트 설정 */}
        <Section title="포인트 설정">
          <div className="flex items-center gap-2 mb-3">
            <Coins size={14} className="text-yellow-500" />
            <p className="text-xs text-gray-500">각 행동별 자동 지급 포인트를 설정합니다</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <PointField label="회원가입" name="pointSignup" value={s.pointSignup} />
            <PointField label="일일 로그인" name="pointLogin" value={s.pointLogin} />
            <PointField label="출석체크 기본" name="pointAttend" value={s.pointAttend} />
            <PointField label="연속출석 보너스 (일당)" name="pointAttendStreakBonus" value={s.pointAttendStreakBonus} />
            <PointField label="게시글 작성" name="pointPost" value={s.pointPost} />
            <PointField label="댓글 작성" name="pointComment" value={s.pointComment} />
          </div>
          <div className="mt-3 px-3 py-2 bg-yellow-50 text-yellow-700 text-xs rounded-lg">
            연속출석 포인트 예시: 기본 {s.pointAttend}P + 7일 연속 시 보너스 {s.pointAttendStreakBonus * 6}P = {s.pointAttend + s.pointAttendStreakBonus * 6}P
          </div>
        </Section>

        {/* 팝업 설정 */}
        <Section title="팝업 설정">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" name="popupEnabled" defaultChecked={s.popupEnabled}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-gray-700 font-medium">메인 팝업 활성화</span>
          </label>
          <div>
            <label className="text-xs text-gray-500 block mb-1">팝업 내용 (HTML 가능)</label>
            <textarea name="popupContent" defaultValue={s.popupContent} rows={4}
              placeholder="팝업에 표시할 내용을 입력하세요"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>
        </Section>

        {/* 접근 제한 */}
        <Section title="접근 제한">
          <div>
            <label className="text-xs text-gray-500 block mb-1">IP 차단 목록 (줄바꿈으로 구분)</label>
            <textarea name="blockedIps" defaultValue={s.blockedIps.join("\n")} rows={4}
              placeholder={"192.168.1.100\n10.0.0.1"}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none font-mono" />
            <p className="text-xs text-gray-400 mt-1">현재 {s.blockedIps.length}개 IP 차단 중</p>
          </div>
        </Section>

        {/* 점검 모드 */}
        <Section title="점검 모드">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="maintenanceMode" defaultChecked={s.maintenanceMode}
              className="w-4 h-4 accent-red-500" />
            <div>
              <span className="text-sm font-medium text-gray-700">점검 모드 활성화</span>
              <p className="text-xs text-gray-400 mt-0.5">활성화 시 관리자 외 접근이 차단됩니다</p>
            </div>
          </label>
          {s.maintenanceMode && (
            <div className="mt-3 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg">
              ⚠ 현재 점검 모드가 활성화되어 있습니다
            </div>
          )}
        </Section>

        <div className="flex justify-end">
          <button type="submit"
            className="px-8 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            설정 저장
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, name, defaultValue, placeholder, className = "" }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input type="text" name={name} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  );
}

function PointField({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="relative">
        <input type="number" name={name} defaultValue={value} min={0}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:border-blue-400" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">P</span>
      </div>
    </div>
  );
}
