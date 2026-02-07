use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageTier {
    Hot,
    Cold,
    Archive,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PlanMeta {
    pub id: BytesN<16>,
    pub title: String,
    pub description: String,
    pub content_hash: BytesN<32>,
    pub ipfs_cid: String,
    pub tags: Vec<String>,
    pub domain: String,
    pub language: String,
    pub framework: String,
    pub contributor: Address,
    pub quality_score: u32,
    pub purchase_count: u32,
    pub tier: StorageTier,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PurchaseRecord {
    pub buyer: Address,
    pub amount_stroops: i128,
    pub contributor_share: i128,
    pub operator_share: i128,
    pub ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct KBStatsResult {
    pub total_plans: u32,
    pub total_purchases: u32,
}

/// Input struct for store_plan to stay under the 10-param Soroban limit.
#[contracttype]
#[derive(Clone, Debug)]
pub struct StorePlanInput {
    pub id: BytesN<16>,
    pub title: String,
    pub description: String,
    pub content_hash: BytesN<32>,
    pub ipfs_cid: String,
    pub tags: Vec<String>,
    pub domain: String,
    pub language: String,
    pub framework: String,
    pub quality_score: u32,
}
