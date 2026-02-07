"use client";

import useSWR from "swr";
import { StatsCards } from "@/components/stats-cards";
import { ActivityChart } from "@/components/activity-chart";
import { TagCloud } from "@/components/tag-cloud";
import { TransactionTable } from "@/components/transaction-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OverviewPage() {
  const { data: txData } = useSWR(
    "/api/transactions?limit=10",
    fetcher,
    { refreshInterval: 30000 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-sm text-gray-500">Synapse network activity and statistics</p>
      </div>

      <StatsCards />

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityChart />
        <TagCloud />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={txData?.transactions || []} />
        </CardContent>
      </Card>
    </div>
  );
}
