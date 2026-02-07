import { NextRequest, NextResponse } from "next/server";
import { getKbDb, getIndexerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const kbDb = getKbDb();
  const indexerDb = getIndexerDb();

  let plan: Record<string, unknown> | null = null;

  if (indexerDb) {
    try {
      plan = indexerDb.prepare("SELECT * FROM indexed_plans WHERE id = ?").get(id) as Record<string, unknown> | undefined ?? null;
    } catch { /* no table */ }
  }

  if (!plan && kbDb) {
    try {
      plan = kbDb.prepare("SELECT * FROM plans WHERE id = ?").get(id) as Record<string, unknown> | undefined ?? null;
    } catch { /* no table */ }
  }

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Parse tags
  if (typeof plan.tags === "string") {
    try { plan.tags = JSON.parse(plan.tags as string); } catch { plan.tags = []; }
  }

  return NextResponse.json(plan);
}
