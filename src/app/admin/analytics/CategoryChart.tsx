"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface CategoryDataPoint {
  name: string;
  조회수: number;
  클릭수: number;
}

interface Props {
  data: CategoryDataPoint[];
}

// FunnelChart·AreaPieChart와 동일한 Empty State
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
      수집된 데이터가 없습니다
    </div>
  );
}

export default function CategoryChart({ data }: Props) {
  if (data.length === 0) return <EmptyState />;

  // 항목 수에 따라 높이를 동적으로 결정 (최소 220px)
  const chartHeight = Math.max(220, data.length * 56 + 80);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"           // 가로 막대 → Y축에 카테고리 이름
        margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}        // 세로 격자만: 가로 막대와 구분
          stroke="#f3f4f6"
        />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1_000 ? `${(v / 1_000).toFixed(1)}k` : String(v)
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#374151", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          width={80}               // 한국어 카테고리명 여백
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            fontSize: 12,
          }}
          formatter={(v, name) => [Number(v).toLocaleString(), String(name)]}
          cursor={{ fill: "#f9fafb" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar
          dataKey="조회수"
          fill="#3b82f6"
          radius={[0, 5, 5, 0]}
          maxBarSize={22}
        />
        <Bar
          dataKey="클릭수"
          fill="#10b981"
          radius={[0, 5, 5, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
