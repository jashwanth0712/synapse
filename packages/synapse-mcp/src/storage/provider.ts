import type {
  Plan,
  PlanMeta,
  PlanSearchResult,
  Purchase,
  ContributorStats,
  KBStats,
  StorePlanInput,
  StorageTier,
} from "../types.js";

export interface SearchOptions {
  query: string;
  tags?: string[];
  limit?: number;
  tier?: StorageTier;
}

export interface StoreOptions {
  tier?: StorageTier;
  publishOnChain?: boolean;
}

export interface StorageProvider {
  // === Core CRUD ===
  store(plan: StorePlanInput, options?: StoreOptions): Promise<Plan>;
  getById(id: string): Promise<Plan | null>;
  getMeta(id: string): Promise<PlanMeta | null>;
  search(options: SearchOptions): Promise<PlanSearchResult[]>;
  contentExists(content: string): Promise<boolean>;

  // === Payment / Purchase Tracking ===
  recordPurchase(
    planId: string,
    buyerAddress: string,
    amountStroops: number,
    txHash: string | null,
  ): Promise<Purchase>;
  getContributorStats(address: string): Promise<ContributorStats>;
  getKBStats(): Promise<KBStats>;

  // === On-Chain Oracle (Soroban) ===
  publishToChain(
    planId: string,
  ): Promise<{ txHash: string; contractId: string }>;
  verifyIntegrity(
    planId: string,
  ): Promise<{ verified: boolean; onChainHash: string; localHash: string }>;
  syncFromChain(contractId: string): Promise<Plan[]>;
  getOnChainMeta(planId: string): Promise<PlanMeta | null>;

  // === Content Addressing ===
  getContentHash(planId: string): Promise<string>;

  // === Lifecycle ===
  close(): Promise<void>;
}
