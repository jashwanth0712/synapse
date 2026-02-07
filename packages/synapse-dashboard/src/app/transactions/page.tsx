"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionTable } from "@/components/transaction-table";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data } = useSWR(
    `/api/transactions?page=${page}&limit=${limit}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        <p className="text-sm text-gray-500">
          All purchases on the Synapse network ({data?.total ?? "..."} total)
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TransactionTable transactions={data?.transactions || []} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
