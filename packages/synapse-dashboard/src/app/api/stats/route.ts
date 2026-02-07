import { NextResponse } from "next/server";
import { getKbDb, getIndexerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const kbDb = getKbDb();
  const indexerDb = getIndexerDb();

  let totalPlans = 0;
  let totalPurchases = 0;
  let totalContributors = 0;
  let totalVolumeStroops = 0;
  const topTags: Array<{ tag: string; count: number }> = [];
  const tierDistribution = { hot: 0, cold: 0, archive: 0 };

  if (kbDb) {
    try {
      const planCount = kbDb.prepare("SELECT COUNT(*) as c FROM plans").get() as { c: number };
      totalPlans = planCount.c;

      const purchaseCount = kbDb.prepare("SELECT COUNT(*) as c FROM purchases").get() as { c: number };
      totalPurchases = purchaseCount.c;

      const contribCount = kbDb.prepare("SELECT COUNT(DISTINCT contributor_address) as c FROM plans").get() as { c: number };
      totalContributors = contribCount.c;

      const volume = kbDb.prepare("SELECT COALESCE(SUM(amount_stroops), 0) as v FROM purchases").get() as { v: number };
      totalVolumeStroops = volume.v;

      const rows = kbDb.prepare("SELECT tags FROM plans").all() as Array<{ tags: string }>;
      const tagCounts: Record<string, number> = {};
      for (const row of rows) {
        try {
          const tags = JSON.parse(row.tags) as string[];
          for (const tag of tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        } catch { /* skip invalid json */ }
      }
      const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      topTags.push(...sorted.map(([tag, count]) => ({ tag, count })));
    } catch { /* kb.db may not have tables yet */ }
  }

  if (indexerDb) {
    try {
      const tiers = indexerDb.prepare(
        "SELECT tier, COUNT(*) as c FROM indexed_plans GROUP BY tier"
      ).all() as Array<{ tier: string; c: number }>;
      for (const t of tiers) {
        if (t.tier in tierDistribution) {
          tierDistribution[t.tier as keyof typeof tierDistribution] = t.c;
        }
      }

      // Supplement plan count from indexer if kb.db is empty
      if (totalPlans === 0) {
        const idxCount = indexerDb.prepare("SELECT COUNT(*) as c FROM indexed_plans").get() as { c: number };
        totalPlans = idxCount.c;
      }
      if (totalContributors === 0) {
        const idxContrib = indexerDb.prepare("SELECT COUNT(DISTINCT contributor_address) as c FROM indexed_plans").get() as { c: number };
        totalContributors = idxContrib.c;
      }
    } catch { /* indexer.db may not exist */ }
  }

  return NextResponse.json({
    total_plans: totalPlans,
    total_purchases: totalPurchases,
    total_contributors: totalContributors,
    total_volume_xlm: totalVolumeStroops / 10_000_000,
    top_tags: topTags,
    tier_distribution: tierDistribution,
  });
}
