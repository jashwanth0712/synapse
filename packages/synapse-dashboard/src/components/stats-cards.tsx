"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShoppingCart, Users, Coins } from "lucide-react";
import type { StatsResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const icons = [FileText, ShoppingCart, Users, Coins];

export function StatsCards() {
  const { data } = useSWR<StatsResponse>("/api/stats", fetcher, {
    refreshInterval: 30000,
  });

  const cards = [
    { title: "Total Plans", value: data?.total_plans ?? "..." },
    { title: "Total Purchases", value: data?.total_purchases ?? "..." },
    { title: "Active Contributors", value: data?.total_contributors ?? "..." },
    { title: "Total Volume", value: data ? `${data.total_volume_xlm.toFixed(2)} XLM` : "..." },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = icons[i];
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
