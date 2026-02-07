"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AddressBadge } from "@/components/address-badge";
import { stroopsToXLM, formatDate, stellarExpertTxUrl } from "@/lib/utils";
import { ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: number;
  plan_id: string;
  buyer_address: string;
  amount_stroops: number;
  contributor_share_stroops: number;
  operator_share_stroops: number;
  transaction_hash: string | null;
  created_at: string;
  plan_title: string;
  contributor_address: string;
}

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No transactions yet</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Buyer → Contributor</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Split (70/30)</TableHead>
          <TableHead>Tx Hash</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
              {formatDate(tx.created_at)}
            </TableCell>
            <TableCell>
              <Link href={`/plans/${tx.plan_id}`} className="text-purple-700 hover:underline text-sm">
                {tx.plan_title}
              </Link>
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-1">
                <AddressBadge address={tx.buyer_address} />
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <AddressBadge address={tx.contributor_address} />
              </span>
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {stroopsToXLM(tx.amount_stroops)} XLM
            </TableCell>
            <TableCell className="text-right text-xs text-gray-500">
              {stroopsToXLM(tx.contributor_share_stroops)} / {stroopsToXLM(tx.operator_share_stroops)}
            </TableCell>
            <TableCell>
              {tx.transaction_hash ? (
                <a
                  href={stellarExpertTxUrl(tx.transaction_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-purple-700 hover:underline"
                >
                  {tx.transaction_hash.slice(0, 8)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-gray-400">local</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
