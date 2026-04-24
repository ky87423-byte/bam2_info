"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1",
];

interface AreaDataPoint {
  name: string;
  value: number;
}

interface Props {
  data: AreaDataPoint[];
}

// 슬라이스가 충분히 클 때만 내부 레이블 표시 (모바일 overflow 방지)
const renderLabel = ({
  cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, name = "",
}: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number;
  percent?: number; name?: string;
}) => {
  if (percent < 0.07) return null; // 7% 미만은 레이블 생략
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={700}
    >
      {name}
    </text>
  );
};

export default function AreaPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        수집된 데이터가 없습니다
      </div>
    );
  }

  return (
    // 높이를 충분히 확보해 범례가 차트를 덮지 않도록 함
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          outerRadius="42%"  // % 단위 → 컨테이너 크기에 따라 자동 조절
          dataKey="value"
          labelLine={false}
          label={renderLabel}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            fontSize: 12,
          }}
          formatter={(v) => [`${Number(v).toLocaleString()}개`, "업소 수"]}
        />
        {/* 범례: 모바일에서도 줄바꿈되도록 wrapperStyle 제한 없음 */}
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8, lineHeight: "20px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
