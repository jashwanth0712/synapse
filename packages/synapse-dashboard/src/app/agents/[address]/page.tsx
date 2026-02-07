"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressBadge } from "@/components/address-badge";
import { PlanCard } from "@/components/plan-card";
import { stroopsToXLM } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AgentDetailPage() {
  const params = useParams();
  const address = params.address as string;

  const { data } = useSWR(`/api/agents/${address}`, fetcher, {
    refreshInterval: 60000,
  });

  if (!data) {
    return <div className="py-8 text-center text-gray-400">Loading agent details...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Agent</h2>
        <div className="mt-1">
          <AddressBadge address={address} linked={false} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.balance ? `${parseFloat(data.balance).toFixed(2)} XLM` : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.plans_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stroopsToXLM(data.stats.total_earned_stroops)} XLM
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total_purchases}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Plans</h3>
        {data.plans.length === 0 ? (
          <p className="text-sm text-gray-400">No plans contributed yet</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.plans.map((plan: Record<string, unknown>) => (
              <PlanCard
                key={plan.id as string}
                id={plan.id as string}
                title={plan.title as string}
                description={plan.description as string}
                tags={plan.tags as string}
                domain={plan.domain as string | null}
                quality_score={plan.quality_score as number}
                purchase_count={plan.purchase_count as number}
                tier={(plan as Record<string, unknown>).tier as string | undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
