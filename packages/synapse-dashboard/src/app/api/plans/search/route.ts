import { NextRequest, NextResponse } from "next/server";
import { getKbDb, getIndexerDb } from "@/lib/db";
import { sanitizeFts5Query } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const tagsParam = req.nextUrl.searchParams.get("tags") || "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 100);

  if (!q.trim() && !tagsParam) {
    return NextResponse.json({ results: [] });
  }

  const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const indexerDb = getIndexerDb();
  const kbDb = getKbDb();

  type ResultRow = {
    id: string;
    title: string;
    description: string;
    tags: string;
    domain: string | null;
    quality_score: number;
    purchase_count: number;
    rank: number;
  };

  let results: ResultRow[] = [];

  // Try indexer FTS first
  if (q.trim() && indexerDb) {
    try {
      let sql = `
        SELECT p.id, p.title, p.description, p.tags, p.domain,
               p.quality_score, p.purchase_count,
               bm25(indexed_plans_fts) as rank
        FROM indexed_plans_fts fts
        JOIN indexed_plans p ON p.rowid = fts.rowid
        WHERE indexed_plans_fts MATCH ?
      `;
      const params: (string | number)[] = [sanitizeFts5Query(q)];

      if (tags.length > 0) {
        for (const tag of tags) {
          sql += " AND p.tags LIKE ?";
          params.push(`%${tag}%`);
        }
      }

      sql += " ORDER BY rank LIMIT ?";
      params.push(limit);

      results = indexerDb.prepare(sql).all(...params) as ResultRow[];
    } catch { /* fts may not be populated */ }
  }

  // Fallback to kb.db FTS
  if (results.length === 0 && q.trim() && kbDb) {
    try {
      let sql = `
        SELECT p.id, p.title, p.description, p.tags, p.domain,
               p.quality_score, p.purchase_count,
               bm25(plans_fts) as rank
        FROM plans_fts fts
        JOIN plans p ON p.rowid = fts.rowid
        WHERE plans_fts MATCH ?
      `;
      const params: (string | number)[] = [sanitizeFts5Query(q)];

      if (tags.length > 0) {
        for (const tag of tags) {
          sql += " AND p.tags LIKE ?";
          params.push(`%${tag}%`);
        }
      }

      sql += " ORDER BY rank LIMIT ?";
      params.push(limit);

      results = kbDb.prepare(sql).all(...params) as ResultRow[];
    } catch { /* fts may not exist */ }
  }

  // Tag-only filter (no FTS query)
  if (!q.trim() && tags.length > 0) {
    const db = indexerDb || kbDb;
    const table = indexerDb ? "indexed_plans" : "plans";
    if (db) {
      try {
        let sql = `SELECT id, title, description, tags, domain, quality_score, purchase_count, 0 as rank FROM ${table} WHERE 1=1`;
        const params: (string | number)[] = [];
        for (const tag of tags) {
          sql += " AND tags LIKE ?";
          params.push(`%${tag}%`);
        }
        sql += " ORDER BY purchase_count DESC LIMIT ?";
        params.push(limit);
        results = db.prepare(sql).all(...params) as ResultRow[];
      } catch { /* no tables */ }
    }
  }

  const parsed = results.map((r) => ({
    ...r,
    tags: (() => { try { return JSON.parse(r.tags); } catch { return []; } })(),
  }));

  return NextResponse.json({ results: parsed });
}
