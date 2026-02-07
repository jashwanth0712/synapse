import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { initIndexerDatabase } from "../src/indexer/schema.js";

describe("Indexer Schema", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "synapse-indexer-test-"));
    dbPath = join(tmpDir, "indexer.db");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should create indexer database with all tables", () => {
    const db = initIndexerDatabase(dbPath);

    // Check tables exist
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("indexed_plans");
    expect(tableNames).toContain("indexed_plans_fts");
    expect(tableNames).toContain("indexer_state");

    db.close();
  });

  it("should support FTS5 search on indexed_plans", () => {
    const db = initIndexerDatabase(dbPath);

    // Insert a plan
    db.prepare(
      `INSERT INTO indexed_plans (id, title, description, content, content_hash, ipfs_cid, tags, contributor_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "test-id-1",
      "Kubernetes Deployment Guide",
      "How to deploy apps on k8s",
      "Full content about kubernetes deployments with helm charts",
      "abc123hash",
      "QmTestCid",
      '["k8s", "deployment"]',
      "GTEST123",
    );

    // FTS search
    const results = db
      .prepare(
        `SELECT p.id, p.title, bm25(indexed_plans_fts) as rank
         FROM indexed_plans_fts fts
         JOIN indexed_plans p ON p.rowid = fts.rowid
         WHERE indexed_plans_fts MATCH ?`,
      )
      .all("kubernetes") as Array<{ id: string; title: string; rank: number }>;

    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Kubernetes Deployment Guide");

    db.close();
  });

  it("should persist indexer state", () => {
    const db = initIndexerDatabase(dbPath);

    // Set last ledger
    db.prepare(
      "INSERT OR REPLACE INTO indexer_state (key, value) VALUES (?, ?)",
    ).run("last_ledger", "12345");

    // Read it back
    const row = db
      .prepare("SELECT value FROM indexer_state WHERE key = ?")
      .get("last_ledger") as { value: string };

    expect(row.value).toBe("12345");

    db.close();
  });

  it("should update FTS index on plan updates via triggers", () => {
    const db = initIndexerDatabase(dbPath);

    db.prepare(
      `INSERT INTO indexed_plans (id, title, description, content, content_hash, ipfs_cid, tags, contributor_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("upd-1", "Alpha Bravo", "desc here", "content here", "hash1", "cid1", "[]", "GADDR");

    // Verify original title is searchable
    const before = db
      .prepare(
        `SELECT p.id FROM indexed_plans_fts fts
         JOIN indexed_plans p ON p.rowid = fts.rowid
         WHERE indexed_plans_fts MATCH ?`,
      )
      .all("Alpha") as Array<{ id: string }>;
    expect(before.length).toBe(1);

    // Update the title to something completely different
    db.prepare("UPDATE indexed_plans SET title = ?, description = ?, content = ? WHERE id = ?").run(
      "Charlie Delta",
      "new description",
      "new content",
      "upd-1",
    );

    // New title should be searchable
    const afterNew = db
      .prepare(
        `SELECT p.id FROM indexed_plans_fts fts
         JOIN indexed_plans p ON p.rowid = fts.rowid
         WHERE indexed_plans_fts MATCH ?`,
      )
      .all("Charlie") as Array<{ id: string }>;
    expect(afterNew.length).toBe(1);

    // Old title should no longer match
    const afterOld = db
      .prepare(
        `SELECT p.id FROM indexed_plans_fts fts
         JOIN indexed_plans p ON p.rowid = fts.rowid
         WHERE indexed_plans_fts MATCH ?`,
      )
      .all("Alpha") as Array<{ id: string }>;
    expect(afterOld.length).toBe(0);

    db.close();
  });
});
