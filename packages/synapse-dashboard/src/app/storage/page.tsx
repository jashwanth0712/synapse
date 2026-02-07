"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TierChart } from "@/components/tier-chart";
import { OracleStatusCard } from "@/components/oracle-status";
import type { OracleStatus } from "@/lib/types";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TTL_INFO: Record<string, string> = {
  hot: "~31 days",
  cold: "~15 days",
  archive: "~7 days",
};

interface TierData {
  distribution: { hot: number; cold: number; archive: number };
  plans_by_tier: Record<string, Array<{
    id: string;
    title: string;
    contributor_address: string;
    quality_score: number;
    purchase_count: number;
    created_at: string;
  }>>;
}

export default function StoragePage() {
  const { data: tierData } = useSWR<TierData>("/api/storage/tiers", fetcher, {
    refreshInterval: 60000,
  });
  const { data: oracle } = useSWR<OracleStatus>("/api/storage/oracle", fetcher, {
    refreshInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Storage</h2>
        <p className="text-sm text-gray-500">Storage tier distribution and oracle status</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {tierData ? (
              <TierChart distribution={tierData.distribution} />
            ) : (
              <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
                Loading...
              </div>
            )}
          </CardContent>
        </Card>

        <OracleStatusCard oracle={oracle ?? null} />
      </div>

      {tierData && (["hot", "cold", "archive"] as const).map((tier) => {
        const plans = tierData.plans_by_tier[tier] || [];
        if (plans.length === 0) return null;
        return (
          <Card key={tier}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge variant={tier}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</Badge>
                <span className="text-sm text-gray-400">TTL: {TTL_INFO[tier]}</span>
                <span className="text-sm text-gray-400">({plans.length} plans)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Quality</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <Link href={`/plans/${plan.id}`} className="text-purple-700 hover:underline">
                          {plan.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        {plan.quality_score > 0 ? plan.quality_score.toFixed(0) : "\u2014"}
                      </TableCell>
                      <TableCell className="text-right">{plan.purchase_count}</TableCell>
                      <TableCell className="text-xs text-gray-500">{plan.created_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
