import { auth } from "@/auth";
import {
  getAttendanceByDate, getTodayAttendance,
  getAttendanceStats, getSettings,
} from "@/lib/data";
import AttendButton from "./AttendButton";
import { Flame, Trophy, Calendar } from "lucide-react";

export default async function AttendPage() {
  const session = await auth();
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = getAttendanceByDate(today);
  const settings = getSettings();

  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const myRecord = userId ? getTodayAttendance(userId) : null;
  const stats = (await getAttendanceStats()).slice(0, 20);

  const bonus1 = settings.pointAttendStreakBonus;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar size={24} className="text-yellow-500" />
          출석부
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {today} · 오늘 출석 {todayRecords.length}명
        </p>
      </div>

      {/* 포인트 안내 */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-yellow-800 mb-2">출석 포인트 안내</p>
        <div className="grid grid-cols-3 gap-2 text-xs text-yellow-700">
          <div className="text-center bg-white/60 rounded-lg px-2 py-2">
            <p className="font-bold text-base text-yellow-600">+{settings.pointAttend}P</p>
            <p>기본 출석</p>
          </div>
          <div className="text-center bg-white/60 rounded-lg px-2 py-2">
            <p className="font-bold text-base text-orange-500">+{bonus1}P×연속</p>
            <p>연속 보너스</p>
          </div>
          <div className="text-center bg-white/60 rounded-lg px-2 py-2">
            <p className="font-bold text-base text-red-500">최대 +{settings.pointAttend + bonus1 * 30}P</p>
            <p>30일 연속 시</p>
          </div>
        </div>
      </div>

      {/* 출석 버튼 */}
      <div className="mb-6">
        {!session ? (
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-500">
              출석하려면{" "}
              <a href="/login" className="text-yellow-600 font-semibold hover:underline">
                로그인
              </a>
              이 필요합니다
            </p>
          </div>
        ) : (
          <AttendButton userId={userId!} alreadyChecked={!!myRecord} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 오늘 출석 현황 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-blue-500" />
            오늘 출석 ({todayRecords.length}명)
          </h2>
          {todayRecords.length > 0 ? (
            <div className="space-y-2">
              {todayRecords.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 ${i < 3 ? "text-yellow-500" : "text-gray-300"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{r.username}</span>
                    {r.streak >= 3 && (
                      <span className="flex items-center gap-0.5 text-xs text-orange-500">
                        <Flame size={11} />
                        {r.streak}일
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-green-600 font-medium">+{r.pointAwarded}P</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(r.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">아직 출석자가 없습니다</p>
          )}
        </div>

        {/* 출석왕 랭킹 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Trophy size={15} className="text-yellow-500" />
            출석왕 TOP 20
          </h2>
          <div className="space-y-2">
            {stats.map((u, i) => (
              <div key={u.userId} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300"}`}>
                    {i + 1}
                  </span>
                  <span className={`text-sm font-medium ${session?.user?.name === u.username ? "text-yellow-600" : "text-gray-800"}`}>
                    {u.username}
                    {session?.user?.name === u.username && " (나)"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {u.streak > 0 && (
                    <span className="flex items-center gap-0.5 text-orange-500">
                      <Flame size={11} />{u.streak}일 연속
                    </span>
                  )}
                  <span className="font-medium text-gray-700">{u.totalAttend}일</span>
                </div>
              </div>
            ))}
            {stats.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">출석 기록이 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
