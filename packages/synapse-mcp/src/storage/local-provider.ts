import type {
  Plan,
  PlanMeta,
  PlanSearchResult,
  Purchase,
  ContributorStats,
  KBStats,
  StorePlanInput,
} from "../types.js";
import type { StorageProvider, SearchOptions, StoreOptions } from "./provider.js";
import { initDatabase } from "./db/schema.js";
import { PlanStore } from "./db/plans.js";

const SOROBAN_ERROR =
  "Soroban oracle not available in local mode. Coming in v2.";

export class LocalStorageProvider implements StorageProvider {
  private planStore: PlanStore;
  private db: ReturnType<typeof initDatabase>;

  constructor(dbPath: string) {
    this.db = initDatabase(dbPath);
    this.planStore = new PlanStore(this.db);
  }

  // === Core CRUD ===

  async store(plan: StorePlanInput, _options?: StoreOptions): Promise<Plan> {
    const description =
      plan.description ||
      plan.content.slice(0, 200).replace(/\n/g, " ").trim();

    return this.planStore.insert({
      title: plan.title,
      description,
      content: plan.content,
      tags: plan.tags,
      domain: plan.domain,
      language: plan.language,
      framework: plan.framework,
      contributor_address: plan.contributor_address,
    });
  }

  async getById(id: string): Promise<Plan | null> {
    return this.planStore.getById(id);
  }

  async getMeta(id: string): Promise<PlanMeta | null> {
    return this.planStore.getMeta(id);
  }

  async search(options: SearchOptions): Promise<PlanSearchResult[]> {
    return this.planStore.search(options.query, options.tags, options.limit);
  }

  async contentExists(content: string): Promise<boolean> {
    return this.planStore.contentHashExists(content);
  }

  // === Payment / Purchase Tracking ===

  async recordPurchase(
    planId: string,
    buyerAddress: string,
    amountStroops: number,
    txHash: string | null,
  ): Promise<Purchase> {
    return this.planStore.recordPurchase(
      planId,
      buyerAddress,
      amountStroops,
      txHash,
    );
  }

  async getContributorStats(address: string): Promise<ContributorStats> {
    return this.planStore.getContributorStats(address);
  }

  async getKBStats(): Promise<KBStats> {
    return this.planStore.getKBStats();
  }

  // === On-Chain Oracle (Soroban) - V2 ===

  async publishToChain(
    _planId: string,
  ): Promise<{ txHash: string; contractId: string }> {
    throw new Error(SOROBAN_ERROR);
  }

  async verifyIntegrity(
    _planId: string,
  ): Promise<{ verified: boolean; onChainHash: string; localHash: string }> {
    throw new Error(SOROBAN_ERROR);
  }

  async syncFromChain(_contractId: string): Promise<Plan[]> {
    throw new Error(SOROBAN_ERROR);
  }

  async getOnChainMeta(_planId: string): Promise<PlanMeta | null> {
    throw new Error(SOROBAN_ERROR);
  }

  // === Content Addressing ===

  async getContentHash(planId: string): Promise<string> {
    const hash = this.planStore.getContentHash(planId);
    if (!hash) throw new Error(`Plan not found: ${planId}`);
    return hash;
  }

  // === Lifecycle ===

  async close(): Promise<void> {
    this.db.close();
  }
}
