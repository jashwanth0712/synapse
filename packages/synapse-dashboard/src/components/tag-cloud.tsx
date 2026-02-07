"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StatsResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TagCloud() {
  const { data } = useSWR<StatsResponse>("/api/stats", fetcher, {
    refreshInterval: 30000,
  });

  const tags = data?.top_tags || [];

  if (tags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">No tags yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Tags</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Badge key={t.tag} variant="purple">
              {t.tag} ({t.count})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
