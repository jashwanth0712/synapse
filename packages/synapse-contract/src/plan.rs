use soroban_sdk::{Address, BytesN, Env, Vec};

use crate::storage_keys::DataKey;
use crate::types::{PlanMeta, StorageTier};

/// TTL ledger counts by tier (approximate days at ~5s/ledger)
const TTL_HOT: u32 = 535_680; // ~31 days
const TTL_COLD: u32 = 267_840; // ~15 days
const TTL_ARCHIVE: u32 = 120_960; // ~7 days

pub fn save_plan(env: &Env, plan: &PlanMeta) {
    env.storage()
        .persistent()
        .set(&DataKey::Plan(plan.id.clone()), plan);

    // Mark content hash as existing for dedup
    env.storage()
        .persistent()
        .set(&DataKey::ContentHash(plan.content_hash.clone()), &true);

    // Update contributor's plan list
    let mut contrib_plans: Vec<BytesN<16>> = env
        .storage()
        .persistent()
        .get(&DataKey::ContribPlans(plan.contributor.clone()))
        .unwrap_or(Vec::new(env));
    contrib_plans.push_back(plan.id.clone());
    env.storage()
        .persistent()
        .set(&DataKey::ContribPlans(plan.contributor.clone()), &contrib_plans);

    // Increment plan count
    let count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::PlanCount)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DataKey::PlanCount, &(count + 1));

    // Set initial TTL
    bump_ttl(env, &plan.id, &plan.tier);
}

pub fn get_plan(env: &Env, plan_id: &BytesN<16>) -> Option<PlanMeta> {
    env.storage()
        .persistent()
        .get(&DataKey::Plan(plan_id.clone()))
}

pub fn content_exists(env: &Env, content_hash: &BytesN<32>) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::ContentHash(content_hash.clone()))
}

pub fn get_contributor_plans(env: &Env, contributor: &Address) -> Vec<BytesN<16>> {
    env.storage()
        .persistent()
        .get(&DataKey::ContribPlans(contributor.clone()))
        .unwrap_or(Vec::new(env))
}

pub fn update_plan(env: &Env, plan: &PlanMeta) {
    env.storage()
        .persistent()
        .set(&DataKey::Plan(plan.id.clone()), plan);
}

pub fn bump_ttl(env: &Env, plan_id: &BytesN<16>, tier: &StorageTier) {
    let ttl = match tier {
        StorageTier::Hot => TTL_HOT,
        StorageTier::Cold => TTL_COLD,
        StorageTier::Archive => TTL_ARCHIVE,
    };
    let key = DataKey::Plan(plan_id.clone());
    env.storage()
        .persistent()
        .extend_ttl(&key, ttl, ttl);
}
