import { NextRequest, NextResponse } from "next/server";
import { getKbDb, getIndexerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  const kbDb = getKbDb();
  const indexerDb = getIndexerDb();

  type AgentRow = {
    contributor_address: string;
    plan_count: number;
    total_purchases: number;
    total_earned_stroops: number;
  };

  let agents: AgentRow[] = [];
  let total = 0;

  if (kbDb) {
    try {
      const countRow = kbDb.prepare(
        "SELECT COUNT(DISTINCT contributor_address) as c FROM plans"
      ).get() as { c: number };
      total = countRow.c;

      agents = kbDb.prepare(`
        SELECT
          p.contributor_address,
          COUNT(DISTINCT p.id) as plan_count,
          COALESCE(SUM(p.purchase_count), 0) as total_purchases,
          COALESCE((
            SELECT SUM(pu.contributor_share_stroops)
            FROM purchases pu
            JOIN plans p2 ON pu.plan_id = p2.id
            WHERE p2.contributor_address = p.contributor_address
          ), 0) as total_earned_stroops
        FROM plans p
        GROUP BY p.contributor_address
        ORDER BY total_purchases DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset) as AgentRow[];
    } catch { /* no tables yet */ }
  }

  // Fallback to indexer if kb is empty
  if (agents.length === 0 && indexerDb) {
    try {
      const countRow = indexerDb.prepare(
        "SELECT COUNT(DISTINCT contributor_address) as c FROM indexed_plans"
      ).get() as { c: number };
      total = countRow.c;

      agents = indexerDb.prepare(`
        SELECT
          contributor_address,
          COUNT(*) as plan_count,
          COALESCE(SUM(purchase_count), 0) as total_purchases,
          0 as total_earned_stroops
        FROM indexed_plans
        GROUP BY contributor_address
        ORDER BY total_purchases DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset) as AgentRow[];
    } catch { /* no tables yet */ }
  }

  return NextResponse.json({ agents, total, page, limit });
}
