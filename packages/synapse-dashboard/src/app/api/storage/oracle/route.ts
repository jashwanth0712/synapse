import { NextResponse } from "next/server";
import { getIndexerDb } from "@/lib/db";
import { getLatestLedger } from "@/lib/soroban";

export const dynamic = "force-dynamic";

export async function GET() {
  const indexerDb = getIndexerDb();

  let lastIndexedLedger = 0;
  if (indexerDb) {
    try {
      const row = indexerDb.prepare(
        "SELECT value FROM indexer_state WHERE key = 'last_ledger'"
      ).get() as { value: string } | undefined;
      lastIndexedLedger = row ? parseInt(row.value, 10) : 0;
    } catch { /* no table */ }
  }

  const latestLedger = await getLatestLedger();
  const lag = latestLedger > 0 ? latestLedger - lastIndexedLedger : 0;

  return NextResponse.json({
    last_indexed_ledger: lastIndexedLedger,
    latest_ledger: latestLedger,
    lag,
    healthy: lag < 100,
  });
}
