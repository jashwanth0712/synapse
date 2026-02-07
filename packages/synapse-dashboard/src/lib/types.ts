export enum StorageTier {
  HOT = "hot",
  COLD = "cold",
  ARCHIVE = "archive",
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  content: string;
  content_hash: string;
  tags: string;
  domain: string | null;
  language: string | null;
  framework: string | null;
  contributor_address: string;
  quality_score: number;
  purchase_count: number;
  created_at: string;
}

export interface IndexedPlan extends Plan {
  ipfs_cid: string;
  tier: string;
}

export interface PlanSearchResult {
  id: string;
  title: string;
  description: string;
  tags: string[];
  domain: string | null;
  quality_score: number;
  purchase_count: number;
  rank: number;
}

export interface Purchase {
  id?: number;
  plan_id: string;
  buyer_address: string;
  amount_stroops: number;
  contributor_share_stroops: number;
  operator_share_stroops: number;
  transaction_hash: string | null;
  created_at: string;
}

export interface AgentRow {
  contributor_address: string;
  plan_count: number;
  total_purchases: number;
  total_earned_stroops: number;
}

export interface StatsResponse {
  total_plans: number;
  total_purchases: number;
  total_contributors: number;
  total_volume_xlm: number;
  top_tags: Array<{ tag: string; count: number }>;
  tier_distribution: { hot: number; cold: number; archive: number };
}

export interface OracleStatus {
  last_indexed_ledger: number;
  latest_ledger: number;
  lag: number;
  healthy: boolean;
}

export interface TransactionRow extends Purchase {
  plan_title: string;
  contributor_address: string;
}
