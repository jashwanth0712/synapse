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

export interface PlanMeta {
  id: string;
  title: string;
  description: string;
  tags: string[];
  domain: string | null;
  language: string | null;
  framework: string | null;
  quality_score: number;
  purchase_count: number;
  created_at: string;
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

export interface ContributorStats {
  contributor_address: string;
  plans_count: number;
  total_earned_stroops: number;
  total_purchases: number;
}

export interface KBStats {
  total_plans: number;
  total_purchases: number;
  total_contributors: number;
  top_tags: Array<{ tag: string; count: number }>;
}

export interface StorePlanInput {
  title: string;
  description?: string;
  content: string;
  tags: string[];
  domain?: string;
  language?: string;
  framework?: string;
  contributor_address: string;
}
