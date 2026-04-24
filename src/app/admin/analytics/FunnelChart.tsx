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

interface FunnelDataPoint {
  name: string;
  조회수: number;
  행동수: number;
}

interface Props {
  data: FunnelDataPoint[];
}

export default function FunnelChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        수집된 데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        // 모바일: left=0(Y축 레이블 잘림 방지), bottom=32(기울인 X축 레이블 여백)
        margin={{ top: 4, right: 8, left: 0, bottom: 32 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          // 레이블이 많을 때 겹치지 않도록 45° 기울임
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            fontSize: 12,
          }}
          formatter={(v) => Number(v).toLocaleString()}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="조회수" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="행동수" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
