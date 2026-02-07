"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ActivityChart() {
  const { data } = useSWR<{ transactions: Array<{ created_at: string }> }>(
    "/api/transactions?limit=100",
    fetcher,
    { refreshInterval: 60000 }
  );

  const chartData = (() => {
    if (!data?.transactions?.length) return [];
    const grouped: Record<string, number> = {};
    for (const tx of data.transactions) {
      const day = tx.created_at?.slice(0, 10) || "unknown";
      grouped[day] = (grouped[day] || 0) + 1;
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date: date.slice(5), count }));
  })();

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
            No purchase activity yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Purchase Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
