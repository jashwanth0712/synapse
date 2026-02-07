"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Purchase {
  created_at: string;
  contributor_share_stroops: number;
}

interface RevenueChartProps {
  purchases: Purchase[];
}

export function RevenueChart({ purchases }: RevenueChartProps) {
  const chartData = (() => {
    if (!purchases?.length) return [];
    const grouped: Record<string, number> = {};
    for (const p of purchases) {
      const day = p.created_at?.slice(0, 10) || "unknown";
      grouped[day] = (grouped[day] || 0) + (p.contributor_share_stroops || 0);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, stroops]) => ({
        date: date.slice(5),
        xlm: Number((stroops / 10_000_000).toFixed(2)),
      }));
  })();

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
            No revenue data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`${value} XLM`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="xlm"
              stroke="#7c3aed"
              fill="url(#revenueGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
