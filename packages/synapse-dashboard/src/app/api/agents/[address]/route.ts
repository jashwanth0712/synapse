import { NextRequest, NextResponse } from "next/server";
import { getKbDb, getIndexerDb } from "@/lib/db";
import { getAccountBalance } from "@/lib/horizon";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  const { address } = params;
  const kbDb = getKbDb();
  const indexerDb = getIndexerDb();

  const balance = await getAccountBalance(address);

  let stats = { plans_count: 0, total_earned_stroops: 0, total_purchases: 0 };
  let plans: unknown[] = [];
  let purchases: unknown[] = [];
  let purchases_made: unknown[] = [];
  let purchases_made_count = 0;
  let total_spent_stroops = 0;

  if (kbDb) {
    try {
      const s = kbDb.prepare(`
        SELECT
          (SELECT COUNT(*) FROM plans WHERE contributor_address = ?) as plans_count,
          COALESCE((SELECT SUM(contributor_share_stroops) FROM purchases pu JOIN plans pl ON pu.plan_id = pl.id WHERE pl.contributor_address = ?), 0) as total_earned_stroops,
          COALESCE((SELECT COUNT(*) FROM purchases pu JOIN plans pl ON pu.plan_id = pl.id WHERE pl.contributor_address = ?), 0) as total_purchases
      `).get(address, address, address) as typeof stats;
      stats = s;

      plans = kbDb.prepare(
        "SELECT id, title, description, tags, domain, quality_score, purchase_count, created_at FROM plans WHERE contributor_address = ? ORDER BY created_at DESC"
      ).all(address);

      purchases = kbDb.prepare(`
        SELECT pu.*, pl.title as plan_title
        FROM purchases pu
        JOIN plans pl ON pu.plan_id = pl.id
        WHERE pl.contributor_address = ?
        ORDER BY pu.created_at DESC
        LIMIT 50
      `).all(address);

      purchases_made = kbDb.prepare(`
        SELECT pu.*, pl.title as plan_title
        FROM purchases pu
        JOIN plans pl ON pu.plan_id = pl.id
        WHERE pu.buyer_address = ?
        ORDER BY pu.created_at DESC
        LIMIT 50
      `).all(address);

      const spentRow = kbDb.prepare(`
        SELECT COUNT(*) as cnt, COALESCE(SUM(amount_stroops), 0) as total
        FROM purchases WHERE buyer_address = ?
      `).get(address) as { cnt: number; total: number };
      purchases_made_count = spentRow.cnt;
      total_spent_stroops = spentRow.total;
    } catch { /* no tables */ }
  }

  if (plans.length === 0 && indexerDb) {
    try {
      plans = indexerDb.prepare(
        "SELECT id, title, description, tags, domain, quality_score, purchase_count, tier, created_at FROM indexed_plans WHERE contributor_address = ? ORDER BY created_at DESC"
      ).all(address);

      stats.plans_count = plans.length;
      stats.total_purchases = (plans as Array<{ purchase_count: number }>).reduce(
        (sum, p) => sum + p.purchase_count, 0
      );
    } catch { /* no tables */ }
  }

  return NextResponse.json({
    address,
    balance,
    stats,
    plans,
    purchases,
    purchases_made,
    purchases_made_count,
    total_spent_stroops,
  });
}
