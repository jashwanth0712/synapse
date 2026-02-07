"use client";

import useSWR from "swr";
import type { OracleStatus } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Header() {
  const { data: oracle } = useSWR<OracleStatus>("/api/storage/oracle", fetcher, {
    refreshInterval: 30000,
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {oracle && (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                oracle.healthy ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-gray-500">
              Oracle: ledger {oracle.last_indexed_ledger.toLocaleString()}
              {oracle.lag > 0 && ` (${oracle.lag} behind)`}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
