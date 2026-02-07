import { NextResponse } from "next/server";
import { getIndexerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const indexerDb = getIndexerDb();

  const distribution = { hot: 0, cold: 0, archive: 0 };
  const plansByTier: Record<string, unknown[]> = { hot: [], cold: [], archive: [] };

  if (indexerDb) {
    try {
      const tiers = indexerDb.prepare(
        "SELECT tier, COUNT(*) as c FROM indexed_plans GROUP BY tier"
      ).all() as Array<{ tier: string; c: number }>;

      for (const t of tiers) {
        if (t.tier in distribution) {
          distribution[t.tier as keyof typeof distribution] = t.c;
        }
      }

      for (const tier of ["hot", "cold", "archive"]) {
        plansByTier[tier] = indexerDb.prepare(
          "SELECT id, title, contributor_address, quality_score, purchase_count, created_at FROM indexed_plans WHERE tier = ? ORDER BY created_at DESC LIMIT 20"
        ).all(tier);
      }
    } catch { /* no tables */ }
  }

  return NextResponse.json({ distribution, plans_by_tier: plansByTier });
}
