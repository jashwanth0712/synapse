import { NextRequest, NextResponse } from "next/server";
import { getKbDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  const kbDb = getKbDb();
  let transactions: unknown[] = [];
  let total = 0;

  if (kbDb) {
    try {
      const countRow = kbDb.prepare("SELECT COUNT(*) as c FROM purchases").get() as { c: number };
      total = countRow.c;

      transactions = kbDb.prepare(`
        SELECT
          pu.id,
          pu.plan_id,
          pu.buyer_address,
          pu.amount_stroops,
          pu.contributor_share_stroops,
          pu.operator_share_stroops,
          pu.transaction_hash,
          pu.created_at,
          pl.title as plan_title,
          pl.contributor_address
        FROM purchases pu
        JOIN plans pl ON pu.plan_id = pl.id
        ORDER BY pu.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    } catch { /* no table */ }
  }

  return NextResponse.json({ transactions, total, page, limit });
}
