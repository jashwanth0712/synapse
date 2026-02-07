import type Database from "better-sqlite3";
import { createHash, randomUUID } from "crypto";
import type {
  Plan,
  PlanMeta,
  PlanSearchResult,
  Purchase,
  ContributorStats,
  KBStats,
} from "../../types.js";

const CONTRIBUTOR_SHARE = 0.7;

export class PlanStore {
  constructor(private db: Database.Database) {}

  insert(plan: {
    title: string;
    description: string;
    content: string;
    tags: string[];
    domain?: string;
    language?: string;
    framework?: string;
    contributor_address: string;
  }): Plan {
    const id = randomUUID();
    const content_hash = createHash("sha256")
      .update(plan.content)
      .digest("hex");
    const tagsJson = JSON.stringify(plan.tags);

    const stmt = this.db.prepare(`
      INSERT INTO plans (id, title, description, content, content_hash, tags, domain, language, framework, contributor_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      plan.title,
      plan.description,
      plan.content,
      content_hash,
      tagsJson,
      plan.domain || null,
      plan.language || null,
      plan.framework || null,
      plan.contributor_address,
    );

    return this.getById(id)!;
  }

  getById(id: string): Plan | null {
    const stmt = this.db.prepare("SELECT * FROM plans WHERE id = ?");
    return (stmt.get(id) as Plan) || null;
  }

  getMeta(id: string): PlanMeta | null {
    const plan = this.db
      .prepare(
        "SELECT id, title, description, tags, domain, language, framework, quality_score, purchase_count, created_at FROM plans WHERE id = ?",
      )
      .get(id) as Plan | undefined;

    if (!plan) return null;

    return {
      ...plan,
      tags: JSON.parse(plan.tags) as string[],
    };
  }

  search(query: string, tags?: string[], limit = 20): PlanSearchResult[] {
    let sql: string;
    const params: unknown[] = [];

    if (query && query.trim()) {
      sql = `
        SELECT p.id, p.title, p.description, p.tags, p.domain, p.quality_score, p.purchase_count,
               bm25(plans_fts) as rank
        FROM plans_fts fts
        JOIN plans p ON p.rowid = fts.rowid
        WHERE plans_fts MATCH ?
      `;
      params.push(query);
    } else {
      sql = `
        SELECT p.id, p.title, p.description, p.tags, p.domain, p.quality_score, p.purchase_count,
               0 as rank
        FROM plans p
        WHERE 1=1
      `;
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        sql += " AND p.tags LIKE ?";
        params.push(`%${tag}%`);
      }
    }

    sql +=
      query && query.trim()
        ? " ORDER BY rank LIMIT ?"
        : " ORDER BY p.purchase_count DESC, p.created_at DESC LIMIT ?";
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as Array<
      Plan & { rank: number }
    >;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      tags: JSON.parse(row.tags) as string[],
      domain: row.domain,
      quality_score: row.quality_score,
      purchase_count: row.purchase_count,
      rank: row.rank,
    }));
  }

  recordPurchase(
    planId: string,
    buyerAddress: string,
    amountStroops: number,
    transactionHash: string | null,
  ): Purchase {
    const contributorShare = Math.floor(amountStroops * CONTRIBUTOR_SHARE);
    const operatorShare = amountStroops - contributorShare;

    this.db
      .prepare(
        `
      INSERT INTO purchases (plan_id, buyer_address, amount_stroops, contributor_share_stroops, operator_share_stroops, transaction_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        planId,
        buyerAddress,
        amountStroops,
        contributorShare,
        operatorShare,
        transactionHash,
      );

    this.db
      .prepare(
        "UPDATE plans SET purchase_count = purchase_count + 1 WHERE id = ?",
      )
      .run(planId);

    return {
      plan_id: planId,
      buyer_address: buyerAddress,
      amount_stroops: amountStroops,
      contributor_share_stroops: contributorShare,
      operator_share_stroops: operatorShare,
      transaction_hash: transactionHash,
      created_at: new Date().toISOString(),
    };
  }

  getContributorStats(address: string): ContributorStats {
    const stats = this.db
      .prepare(
        `
      SELECT
        ? as contributor_address,
        (SELECT COUNT(*) FROM plans WHERE contributor_address = ?) as plans_count,
        COALESCE((SELECT SUM(contributor_share_stroops) FROM purchases p JOIN plans pl ON p.plan_id = pl.id WHERE pl.contributor_address = ?), 0) as total_earned_stroops,
        COALESCE((SELECT COUNT(*) FROM purchases p JOIN plans pl ON p.plan_id = pl.id WHERE pl.contributor_address = ?), 0) as total_purchases
    `,
      )
      .get(address, address, address, address) as ContributorStats;

    return stats;
  }

  getKBStats(): KBStats {
    const totalPlans = (
      this.db
        .prepare("SELECT COUNT(*) as count FROM plans")
        .get() as { count: number }
    ).count;
    const totalPurchases = (
      this.db
        .prepare("SELECT COUNT(*) as count FROM purchases")
        .get() as { count: number }
    ).count;
    const totalContributors = (
      this.db
        .prepare(
          "SELECT COUNT(DISTINCT contributor_address) as count FROM plans",
        )
        .get() as { count: number }
    ).count;

    const plans = this.db
      .prepare("SELECT tags FROM plans")
      .all() as Array<{ tags: string }>;
    const tagCounts: Record<string, number> = {};
    for (const row of plans) {
      const tags = JSON.parse(row.tags) as string[];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      total_plans: totalPlans,
      total_purchases: totalPurchases,
      total_contributors: totalContributors,
      top_tags: topTags,
    };
  }

  contentHashExists(content: string): boolean {
    const hash = createHash("sha256").update(content).digest("hex");
    const row = this.db
      .prepare("SELECT 1 FROM plans WHERE content_hash = ?")
      .get(hash);
    return !!row;
  }

  getContentHash(planId: string): string | null {
    const plan = this.db
      .prepare("SELECT content_hash FROM plans WHERE id = ?")
      .get(planId) as { content_hash: string } | undefined;
    return plan?.content_hash || null;
  }
}
