"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AddressBadge } from "@/components/address-badge";
import { stroopsToXLM } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Agent {
  contributor_address: string;
  plan_count: number;
  total_purchases: number;
  total_earned_stroops: number;
}

export default function AgentsPage() {
  const { data } = useSWR<{ agents: Agent[]; total: number }>(
    "/api/agents?limit=50",
    fetcher,
    { refreshInterval: 60000 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Agents</h2>
        <p className="text-sm text-gray-500">
          All contributors on the Synapse network ({data?.total ?? "..."} total)
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Plans</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
                <TableHead className="text-right">Estimated Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.agents?.map((agent) => (
                <TableRow key={agent.contributor_address}>
                  <TableCell>
                    <AddressBadge address={agent.contributor_address} />
                  </TableCell>
                  <TableCell className="text-right">{agent.plan_count}</TableCell>
                  <TableCell className="text-right">{agent.total_purchases}</TableCell>
                  <TableCell className="text-right font-mono">
                    {stroopsToXLM(agent.total_earned_stroops)} XLM
                  </TableCell>
                </TableRow>
              )) ?? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">
                    Loading agents...
                  </TableCell>
                </TableRow>
              )}
              {data?.agents?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">
                    No agents found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
