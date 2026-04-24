-- AnalyticsEvent: 기간 우선 Popular Shops 쿼리용
CREATE INDEX "AnalyticsEvent_createdAt_storeId_idx"
  ON "AnalyticsEvent"("createdAt", "storeId");

-- AnalyticsEvent: 의심 IP 탐지 (IP별 단시간 이벤트)
CREATE INDEX "AnalyticsEvent_ipAddress_createdAt_idx"
  ON "AnalyticsEvent"("ipAddress", "createdAt");

-- SearchLog: 결과 0건 키워드 집계
CREATE INDEX "SearchLog_resultCount_idx"
  ON "SearchLog"("resultCount");

-- Shop: 30일 미접속 업주 필터
CREATE INDEX "Shop_lastLoginAt_idx"
  ON "Shop"("lastLoginAt");
