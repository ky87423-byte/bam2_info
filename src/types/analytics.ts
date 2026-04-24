export type Granularity = "day" | "week" | "month";

export interface AnalyticsData {
  generatedAt: string;
  from: string;         // ISO date YYYY-MM-DD (inclusive)
  to:   string;         // ISO date YYYY-MM-DD (exclusive upper bound)
  rangeDays:   number;  // to - from (일 단위)
  granularity: Granularity;
  funnel: Array<{
    storeId: number;
    views: number;
    actions: number;
    conversionRate: number;
  }>;
  popularShops: Array<{
    storeId: number;
    eventCount: number;
  }>;
  zeroKeywords: Array<{
    keyword: string;
    count: number;
  }>;
  suspiciousIps: Array<{
    ipAddress: string;
    eventCount: number;
  }>;
  inactiveShops: Array<{
    id: number;
    company: string;
    lastLoginAt: string | null;
  }>;
  period: {
    current:  { views: number; actions: number; total: number; conversionRate: number };
    previous: { views: number; actions: number; total: number; conversionRate: number };
    changes:  { views: number; actions: number; total: number; conversionRate: number };
  } | null;
  areaData:        Array<{ name: string; value: number }>;
  categoryData:    Array<{ name: string; 조회수: number; 클릭수: number }>;
  funnelChartData: Array<{ name: string; 조회수: number; 행동수: number }>;
  timeSeriesData:  Array<{ date: string; views: number; actions: number }>;
  totalViews:   number;
  totalActions: number;
  avgConv:      number;
  totalShops:   number;
}
