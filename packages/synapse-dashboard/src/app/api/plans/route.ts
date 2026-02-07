import { NextRequest, NextResponse } from "next/server";
import { getKbDb, getIndexerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 100);
  const tier = req.nextUrl.searchParams.get("tier");
  const offset = (page - 1) * limit;

  const kbDb = getKbDb();
  const indexerDb = getIndexerDb();

  let plans: unknown[] = [];
  let total = 0;

  // Try indexer first (has tier info)
  if (indexerDb) {
    try {
      let where = "1=1";
      const params: unknown[] = [];
      if (tier) {
        where += " AND tier = ?";
        params.push(tier);
      }

      const countRow = indexerDb.prepare(
        `SELECT COUNT(*) as c FROM indexed_plans WHERE ${where}`
      ).get(...params) as { c: number };
      total = countRow.c;

      plans = indexerDb.prepare(`
        SELECT id, title, description, tags, domain, language, framework,
               contributor_address, quality_score, purchase_count, tier, ipfs_cid, created_at
        FROM indexed_plans
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);
    } catch { /* no tables */ }
  }

  // Fallback to kb.db
  if (plans.length === 0 && kbDb) {
    try {
      const countRow = kbDb.prepare("SELECT COUNT(*) as c FROM plans").get() as { c: number };
      total = countRow.c;

      plans = kbDb.prepare(`
        SELECT id, title, description, tags, domain, language, framework,
               contributor_address, quality_score, purchase_count, created_at
        FROM plans
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } catch { /* no tables */ }
  }

  return NextResponse.json({ plans, total, page, limit });
}
