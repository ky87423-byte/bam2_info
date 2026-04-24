export default function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {/* alert placeholder */}
      <div className="h-14 bg-orange-100 rounded-2xl" />

      {/* 요약 카드 — 실제 레이아웃과 동일한 2열/4열 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm ring-1 ring-black/5 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-2.5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TimeSeries: 전체 너비 */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="p-4 sm:p-6">
            <div className="h-[240px] bg-gray-100 rounded-xl" />
          </div>
        </div>
        {/* Funnel: 전체 너비 */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-2/5" />
          </div>
          <div className="p-4 sm:p-6">
            <div className="h-[280px] bg-gray-100 rounded-xl" />
          </div>
        </div>
        {/* 지역 파이 + 카테고리 바 */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="p-4 sm:p-6">
              <div className="h-[280px] bg-gray-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* 테이블 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="p-4 sm:p-6 space-y-2.5">
              <div className="h-6 bg-gray-100 rounded" />
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-9 bg-gray-50 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
