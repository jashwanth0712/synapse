import * as StellarSdk from "@stellar/stellar-sdk";
const { rpc: SorobanRpc, xdr } = StellarSdk;
import Database from "better-sqlite3";

import { initIndexerDatabase } from "./schema.js";
import { sanitizeFts5Query } from "../utils/fts5.js";
import type { IPFSClient } from "../ipfs/client.js";
import type { PlanSearchResult } from "../types.js";

const POLL_INTERVAL_MS = 5_000;

interface IndexedPlanRow {
  id: string;
  title: string;
  description: string;
  content: string;
  content_hash: string;
  ipfs_cid: string;
  tags: string;
  domain: string | null;
  language: string | null;
  framework: string | null;
  contributor_address: string;
  quality_score: number;
  purchase_count: number;
  tier: string;
  created_at: string;
}

export class SorobanEventIndexer {
  private rpcServer: SorobanRpc.Server;
  private contractId: string;
  private db: Database.Database;
  private ipfsClient: IPFSClient;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    rpcUrl: string,
    contractId: string,
    dbPath: string,
    ipfsClient: IPFSClient,
  ) {
    this.rpcServer = new SorobanRpc.Server(rpcUrl);
    this.contractId = contractId;
    this.db = initIndexerDatabase(dbPath);
    this.ipfsClient = ipfsClient;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    // Initial poll
    this.processEvents().catch((err) =>
      console.error("[Indexer] Initial poll error:", err),
    );

    // Recurring poll
    this.pollTimer = setInterval(() => {
      this.processEvents().catch((err) =>
        console.error("[Indexer] Poll error:", err),
      );
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.db.close();
  }

  private getLastLedger(): number {
    const row = this.db
      .prepare("SELECT value FROM indexer_state WHERE key = ?")
      .get("last_ledger") as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  }

  private setLastLedger(ledger: number): void {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO indexer_state (key, value) VALUES (?, ?)",
      )
      .run("last_ledger", ledger.toString());
  }

  async processEvents(): Promise<void> {
    try {
      const lastLedger = this.getLastLedger();

      // Get the latest ledger to determine start
      const latestLedger = await this.rpcServer.getLatestLedger();
      const startLedger = lastLedger > 0 ? lastLedger + 1 : Math.max(1, latestLedger.sequence - 1000);

      if (startLedger > latestLedger.sequence) return;

      const response = await this.rpcServer.getEvents({
        startLedger,
        filters: [
          {
            type: "contract",
            contractIds: [this.contractId],
          },
        ],
        limit: 100,
      });

      if (!response.events || response.events.length === 0) {
        // Even with no events, advance cursor to avoid re-scanning
        this.setLastLedger(latestLedger.sequence);
        return;
      }

      for (const event of response.events) {
        await this.handleEvent(event);
      }

      // Update cursor to the last event's ledger
      const maxLedger = Math.max(
        ...response.events.map((e) => e.ledger),
      );
      this.setLastLedger(maxLedger);
    } catch (err) {
      // Non-fatal: log and retry next poll
      console.error("[Indexer] processEvents error:", err);
    }
  }

  private async handleEvent(event: SorobanRpc.Api.EventResponse): Promise<void> {
    const topics = event.topic;
    if (!topics || topics.length === 0) return;

    // Decode the topic symbol
    const topicXdr = xdr.ScVal.fromXDR(topics[0], "base64");
    const topicSym = topicXdr.sym()?.toString();

    switch (topicSym) {
      case "plan_st":
        await this.handlePlanStored(event);
        break;
      case "plan_pu":
        this.handlePlanPurchased(event);
        break;
      case "tier_ch":
        this.handleTierChanged(event);
        break;
    }
  }

  private async handlePlanStored(event: SorobanRpc.Api.EventResponse): Promise<void> {
    try {
      const valueXdr = xdr.ScVal.fromXDR(event.value, "base64");
      const fields = valueXdr.vec();
      if (!fields || fields.length < 7) return;

      const planIdBytes = fields[0].bytes();
      const contentHashBytes = fields[1].bytes();
      const contributor = fields[2].address()?.accountId()?.ed25519()?.toString("hex") || "";
      const title = fields[3].str()?.toString() || "";
      const tagsVec = fields[4].vec() || [];
      const ipfsCid = fields[5].str()?.toString() || "";

      const planId = planIdBytes ? Buffer.from(planIdBytes).toString("hex") : "";
      const contentHash = contentHashBytes ? Buffer.from(contentHashBytes).toString("hex") : "";
      const tags = tagsVec.map((t: xdr.ScVal) => t.str()?.toString() || "");

      // Fetch full content from IPFS for FTS indexing
      let content = "";
      try {
        if (ipfsCid) {
          content = await this.ipfsClient.get(ipfsCid);
        }
      } catch {
        console.error(`[Indexer] Failed to fetch IPFS content for ${ipfsCid}`);
      }

      this.db
        .prepare(
          `INSERT OR IGNORE INTO indexed_plans
           (id, title, description, content, content_hash, ipfs_cid, tags, contributor_address, tier)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'hot')`,
        )
        .run(planId, title, title, content, contentHash, ipfsCid, JSON.stringify(tags), contributor);
    } catch (err) {
      console.error("[Indexer] handlePlanStored error:", err);
    }
  }

  private handlePlanPurchased(event: SorobanRpc.Api.EventResponse): void {
    try {
      const valueXdr = xdr.ScVal.fromXDR(event.value, "base64");
      const fields = valueXdr.vec();
      if (!fields || fields.length < 4) return;

      const planIdBytes = fields[0].bytes();
      const planId = planIdBytes ? Buffer.from(planIdBytes).toString("hex") : "";

      this.db
        .prepare(
          "UPDATE indexed_plans SET purchase_count = purchase_count + 1, tier = 'hot' WHERE id = ?",
        )
        .run(planId);
    } catch (err) {
      console.error("[Indexer] handlePlanPurchased error:", err);
    }
  }

  private handleTierChanged(event: SorobanRpc.Api.EventResponse): void {
    try {
      const valueXdr = xdr.ScVal.fromXDR(event.value, "base64");
      const fields = valueXdr.vec();
      if (!fields || fields.length < 3) return;

      const planIdBytes = fields[0].bytes();
      const planId = planIdBytes ? Buffer.from(planIdBytes).toString("hex") : "";

      // New tier is the 3rd field
      const newTierVal = fields[2].vec();
      let newTier = "hot";
      if (newTierVal) {
        const tierName = newTierVal[0]?.sym()?.toString()?.toLowerCase();
        if (tierName === "cold" || tierName === "archive") {
          newTier = tierName;
        }
      }

      this.db
        .prepare("UPDATE indexed_plans SET tier = ? WHERE id = ?")
        .run(newTier, planId);
    } catch (err) {
      console.error("[Indexer] handleTierChanged error:", err);
    }
  }

  // === Search API (used by SorobanStorageProvider) ===

  search(
    query: string,
    tags?: string[],
    limit: number = 20,
  ): PlanSearchResult[] {
    let sql = `
      SELECT p.id, p.title, p.description, p.tags, p.domain,
             p.quality_score, p.purchase_count,
             bm25(indexed_plans_fts) as rank
      FROM indexed_plans_fts fts
      JOIN indexed_plans p ON p.rowid = fts.rowid
      WHERE indexed_plans_fts MATCH ?
    `;
    const params: (string | number)[] = [sanitizeFts5Query(query)];

    if (tags && tags.length > 0) {
      const placeholders = tags.map(() => "?").join(", ");
      sql += ` AND EXISTS (
        SELECT 1 FROM json_each(p.tags) AS t
        WHERE t.value IN (${placeholders})
      )`;
      params.push(...tags);
    }

    sql += " ORDER BY rank LIMIT ?";
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      title: string;
      description: string;
      tags: string;
      domain: string | null;
      quality_score: number;
      purchase_count: number;
      rank: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      tags: JSON.parse(r.tags) as string[],
      domain: r.domain,
      quality_score: r.quality_score,
      purchase_count: r.purchase_count,
      rank: r.rank,
    }));
  }

  getById(id: string): IndexedPlanRow | null {
    return (
      (this.db
        .prepare("SELECT * FROM indexed_plans WHERE id = ?")
        .get(id) as IndexedPlanRow | undefined) || null
    );
  }

  getStats(): { total_plans: number; total_purchases: number } {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) as total_plans, COALESCE(SUM(purchase_count), 0) as total_purchases FROM indexed_plans",
      )
      .get() as { total_plans: number; total_purchases: number };
    return row;
  }
}
