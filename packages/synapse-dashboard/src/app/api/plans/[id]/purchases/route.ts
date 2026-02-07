import { NextRequest, NextResponse } from "next/server";
import { getKbDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const kbDb = getKbDb();

  let purchases: unknown[] = [];

  if (kbDb) {
    try {
      purchases = kbDb.prepare(
        "SELECT * FROM purchases WHERE plan_id = ? ORDER BY created_at DESC"
      ).all(id);
    } catch { /* no table */ }
  }

  return NextResponse.json({ purchases });
}
