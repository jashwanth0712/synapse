"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressBadge } from "@/components/address-badge";
import { AgentSetup } from "@/components/agent-setup";
import { RevenueChart } from "@/components/revenue-chart";
import { PlanCard } from "@/components/plan-card";
import { useMyAgent } from "@/hooks/use-my-agent";
import { stroopsToXLM, formatDate } from "@/lib/utils";
import { Wallet, FileText, TrendingUp, ShoppingCart, Loader2, ExternalLink, Zap } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MyAgentPage() {
  const { address, setAddress, clearAddress, isLoaded } = useMyAgent();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Agent</h2>
          <p className="text-sm text-gray-500">Link your local agent to track its performance</p>
        </div>
        <AgentSetup onConnect={setAddress} />
      </div>
    );
  }

  return <AgentDashboard address={address} onDisconnect={clearAddress} />;
}

function AgentDashboard({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const { data } = useSWR(`/api/agents/${address}`, fetcher, {
    refreshInterval: 30000,
  });
  const [funding, setFunding] = useState(false);
  const [fundResult, setFundResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleFund = async () => {
    setFunding(true);
    setFundResult(null);
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
      if (res.ok) {
        setFundResult({ ok: true, message: "Funded 10,000 XLM from Friendbot!" });
      } else {
        setFundResult({ ok: false, message: "Friendbot request failed. Try again later." });
      }
    } catch {
      setFundResult({ ok: false, message: "Network error. Check your connection." });
    }
    setFunding(false);
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Agent</h2>
            <div className="mt-1">
              <AddressBadge address={address} linked={false} />
            </div>
          </div>
        </div>
        <div className="py-8 text-center text-gray-400">Loading agent data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Agent</h2>
          <div className="mt-1">
            <AddressBadge address={address} linked={false} />
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
        >
          Disconnect
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.balance ? `${parseFloat(data.balance).toFixed(2)} XLM` : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Plans Contributed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.plans_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Revenue Earned</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stroopsToXLM(data.stats.total_earned_stroops)} XLM
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5" /> Plans Purchased</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.purchases_made_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <RevenueChart purchases={data.purchases || []} />

      {/* Two Columns: My Plans + Plans I Used */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Plans */}
        <div>
          <h3 className="text-lg font-semibold mb-4">My Plans</h3>
          {data.plans.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-gray-400">
                No plans contributed yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
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

        {/* Plans I Used */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Plans I Used</h3>
          {(!data.purchases_made || data.purchases_made.length === 0) ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-gray-400">
                No plans purchased yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.purchases_made.map((p: Record<string, unknown>, i: number) => (
                <Card key={i}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.plan_title as string}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(p.created_at as string)}
                        </p>
                      </div>
                      <Badge variant="purple">
                        {stroopsToXLM(p.amount_stroops as number)} XLM
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-up Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Testnet Top-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Fund your agent with testnet XLM using Stellar Friendbot. Each request adds 10,000 XLM.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFund}
              disabled={funding}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {funding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Fund with Friendbot
            </button>
            <a
              href="https://laboratory.stellar.org/#account-creator?network=test"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-purple-600 hover:underline"
            >
              Stellar Laboratory
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {fundResult && (
            <p className={`text-sm ${fundResult.ok ? "text-green-600" : "text-red-500"}`}>
              {fundResult.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
