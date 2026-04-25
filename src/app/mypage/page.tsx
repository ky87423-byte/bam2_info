import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserById, getPointLogs, getTodayAttendance, getUserCoupons } from "@/lib/data";
import { Coins, Flame, Calendar, TrendingUp, TrendingDown, Tag, Store, Clock } from "lucide-react";
import MyCouponUsedButton from "./MyCouponUsedButton";

const ACTION_LABELS: Record<string, string> = {
  signup: "회원가입",
  login: "일일 로그인",
  attend: "출석체크",
  post: "게시글 작성",
  comment: "댓글 작성",
  admin: "관리자 지급",
  etc: "기타",
};

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);
  if (!user) redirect("/login");

  const { logs, total: totalLogs } = await getPointLogs({ userId, page: 1, pageSize: 20 });
  const todayAttend  = getTodayAttendance(userId);
  const myCoupons    = getUserCoupons(userId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">마이페이지</h1>

      {/* 프로필 카드 */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2a2a4e] text-white rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm">안녕하세요,</p>
            <p className="text-xl font-bold mt-0.5">{user.username}</p>
            <p className="text-white/50 text-xs mt-1">닉네임: {user.nickname}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Lv.{user.level}</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              {user.points.toLocaleString()}P
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-blue-300" />
            <div>
              <p className="text-xs text-white/50">총 출석</p>
              <p className="text-sm font-semibold">{user.totalAttend ?? 0}일</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-300" />
            <div>
              <p className="text-xs text-white/50">연속 출석</p>
              <p className="text-sm font-semibold">{user.attendStreak ?? 0}일</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins size={14} className="text-yellow-300" />
            <div>
              <p className="text-xs text-white/50">가입일</p>
              <p className="text-sm font-semibold">{user.joinedAt}</p>
            </div>
          </div>
          <div className="ml-auto">
            {todayAttend ? (
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                오늘 출석 완료
              </span>
            ) : (
              <a
                href="/attend"
                className="text-xs bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded-full hover:bg-yellow-400/30 transition-colors"
              >
                출석하러 가기 →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 쿠폰 보관함 */}
      {myCoupons.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Tag size={16} className="text-green-500" />
              쿠폰 보관함
            </h2>
            <span className="text-xs text-gray-400">{myCoupons.length}장</span>
          </div>
          <div className="space-y-2">
            {myCoupons.map((uc) => (
              <div key={uc.id} className={`flex items-center gap-3 p-3 rounded-lg border ${uc.usedAt ? "bg-gray-50 border-gray-100 opacity-60" : "bg-green-50 border-green-100"}`}>
                <div className="shrink-0 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center text-white">
                  <Tag size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{uc.coupon.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span className="font-semibold text-green-600">{uc.coupon.discount}</span>
                    {uc.coupon.shopName && (
                      <span className="flex items-center gap-0.5"><Store size={10} />{uc.coupon.shopName}</span>
                    )}
                    {uc.coupon.validUntil && (
                      <span className="flex items-center gap-0.5"><Clock size={10} />{uc.coupon.validUntil}까지</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {uc.usedAt ? (
                    <span className="text-xs text-gray-400">사용완료<br />{uc.usedAt}</span>
                  ) : (
                    <MyCouponUsedButton userCouponId={uc.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 포인트 내역 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Coins size={16} className="text-yellow-500" />
            포인트 내역
          </h2>
          <span className="text-xs text-gray-400">총 {totalLogs}건</span>
        </div>

        {logs.length > 0 ? (
          <div className="space-y-0 divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${log.amount >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                    {log.amount >= 0 ? (
                      <TrendingUp size={14} className="text-green-500" />
                    ) : (
                      <TrendingDown size={14} className="text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{log.memo}</p>
                    <p className="text-xs text-gray-400">
                      {ACTION_LABELS[log.action] ?? log.action} ·{" "}
                      {new Date(log.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${log.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {log.amount >= 0 ? "+" : ""}{log.amount.toLocaleString()}P
                  </p>
                  <p className="text-xs text-gray-400">{log.balance.toLocaleString()}P</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">포인트 내역이 없습니다</p>
        )}
      </div>
    </div>
  );
}
