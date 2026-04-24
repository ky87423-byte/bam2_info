import { Suspense } from "react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AnalyticsSkeleton from "./AnalyticsSkeleton";

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
