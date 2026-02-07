"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OracleStatus } from "@/lib/types";

export function OracleStatusCard({ oracle }: { oracle: OracleStatus | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Oracle Status</CardTitle>
      </CardHeader>
      <CardContent>
        {!oracle ? (
          <p className="text-sm text-gray-400">Loading oracle status...</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${oracle.healthy ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium">
                {oracle.healthy ? "Healthy" : "Lagging"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Last Indexed</p>
                <p className="font-mono font-medium">{oracle.last_indexed_ledger.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Latest Ledger</p>
                <p className="font-mono font-medium">{oracle.latest_ledger.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Lag</p>
                <p className="font-mono font-medium">{oracle.lag} ledgers</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">Oracle Architecture</p>
              <p>Soroban Contract → Event Polling (5s) → Indexer SQLite → API → UI</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
