"use client";

import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  hot: "#f97316",
  cold: "#3b82f6",
  archive: "#6b7280",
};

export function TierChart({ distribution }: { distribution: { hot: number; cold: number; archive: number } }) {
  const data = [
    { name: "Hot", value: distribution.hot },
    { name: "Cold", value: distribution.cold },
    { name: "Archive", value: distribution.archive },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
        No tier data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()]} />
          ))}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
