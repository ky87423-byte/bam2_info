"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Granularity } from "@/types/analytics";

interface Props {
  data: Array<{ date: string; views: number; actions: number }>;
  granularity: Granularity;
}

function formatTick(d: string, g: Granularity): string {
  const dt = new Date(d);
  const y  = dt.getUTCFullYear();
  const m  = dt.getUTCMonth() + 1;
  const dd = dt.getUTCDate();
  if (g === "month") return `${y}.${String(m).padStart(2, "0")}`;
  if (g === "week")  return `${m}/${dd}주`;
  return `${m}/${dd}`;
}

function formatFullDate(d: string, g: Granularity): string {
  const dt = new Date(d);
  const y  = dt.getUTCFullYear();
  const m  = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  if (g === "month") return `${y}년 ${Number(m)}월`;
  if (g === "week")  return `${y}.${m}.${dd} 주`;
  return `${y}.${m}.${dd}`;
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
      해당 기간에 데이터가 없습니다
    </div>
  );
}

export default function TimeSeriesChart({ data, granularity }: Props) {
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(d: string) => formatTick(d, granularity)}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(v)
          }
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
          labelFormatter={(d) => formatFullDate(String(d), granularity)}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="views"
          name="조회수"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="actions"
          name="행동수"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
