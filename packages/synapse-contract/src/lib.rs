#![no_std]

mod admin;
mod events;
mod plan;
mod purchase;
mod storage_keys;
mod types;

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Vec};

use crate::admin::{get_contributor_share_pct, require_admin};
use crate::events::{emit_plan_purchased, emit_plan_stored, emit_tier_changed};
use crate::plan as plan_mod;
use crate::purchase as purchase_mod;
use crate::storage_keys::DataKey;
use crate::types::{KBStatsResult, PlanMeta, PurchaseRecord, StorageTier, StorePlanInput};

#[contract]
pub struct SynapseContract;

#[contractimpl]
impl SynapseContract {
    /// One-time initialization of the contract.
    pub fn initialize(
        env: Env,
        admin: Address,
        operator: Address,
        contributor_share_pct: u32,
        native_token: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        assert!(
            contributor_share_pct <= 100,
            "Share percentage must be <= 100"
        );

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::OperatorAddress, &operator);
        env.storage()
            .instance()
            .set(&DataKey::ContributorSharePct, &contributor_share_pct);
        env.storage()
            .instance()
            .set(&DataKey::NativeTokenAddress, &native_token);
        env.storage().instance().set(&DataKey::PlanCount, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::TotalPurchases, &0u32);
    }

    /// Store a new plan's metadata on-chain. Content lives on IPFS.
    /// Uses StorePlanInput struct to stay under the 10-param Soroban limit.
    pub fn store_plan(
        env: Env,
        contributor: Address,
        input: StorePlanInput,
    ) {
        contributor.require_auth();

        // Dedup check
        if plan_mod::content_exists(&env, &input.content_hash) {
            panic!("Content with this hash already exists");
        }

        let tier = StorageTier::Hot;
        let plan = PlanMeta {
            id: input.id.clone(),
            title: input.title.clone(),
            description: input.description,
            content_hash: input.content_hash.clone(),
            ipfs_cid: input.ipfs_cid.clone(),
            tags: input.tags.clone(),
            domain: input.domain,
            language: input.language,
            framework: input.framework,
            contributor: contributor.clone(),
            quality_score: input.quality_score,
            purchase_count: 0,
            tier: tier.clone(),
            created_at: env.ledger().timestamp(),
        };

        plan_mod::save_plan(&env, &plan);

        emit_plan_stored(
            &env,
            &input.id,
            &input.content_hash,
            &contributor,
            &input.title,
            &input.tags,
            &input.ipfs_cid,
            &tier,
        );
    }

    /// Read plan metadata by ID.
    pub fn get_plan(env: Env, plan_id: BytesN<16>) -> Option<PlanMeta> {
        plan_mod::get_plan(&env, &plan_id)
    }

    /// Check if content with this hash already exists (dedup).
    pub fn content_exists(env: Env, content_hash: BytesN<32>) -> bool {
        plan_mod::content_exists(&env, &content_hash)
    }

    /// Purchase a plan: atomic 70/30 XLM split between contributor and operator.
    pub fn purchase_plan(
        env: Env,
        buyer: Address,
        plan_id: BytesN<16>,
        amount: i128,
    ) -> PurchaseRecord {
        let plan = plan_mod::get_plan(&env, &plan_id).expect("Plan not found");

        let record = purchase_mod::execute_purchase(&env, &buyer, &plan_id, amount);

        emit_plan_purchased(&env, &plan_id, &buyer, amount, &plan.contributor);

        record
    }

    /// Get purchase history for a plan.
    pub fn get_purchases(env: Env, plan_id: BytesN<16>) -> Vec<PurchaseRecord> {
        purchase_mod::get_purchases(&env, &plan_id)
    }

    /// Get all plan IDs contributed by an address.
    pub fn get_contributor_plans(env: Env, contributor: Address) -> Vec<BytesN<16>> {
        plan_mod::get_contributor_plans(&env, &contributor)
    }

    /// Change storage tier (admin or contributor only).
    pub fn set_tier(env: Env, caller: Address, plan_id: BytesN<16>, new_tier: StorageTier) {
        caller.require_auth();

        let mut plan = plan_mod::get_plan(&env, &plan_id).expect("Plan not found");

        // Only admin or the plan's contributor can change tier
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if caller != admin && caller != plan.contributor {
            panic!("Only admin or contributor can change tier");
        }

        let old_tier = plan.tier.clone();
        plan.tier = new_tier.clone();
        plan_mod::update_plan(&env, &plan);
        plan_mod::bump_ttl(&env, &plan_id, &new_tier);

        emit_tier_changed(&env, &plan_id, &old_tier, &new_tier);
    }

    /// Extend TTL for a plan based on its current tier.
    pub fn bump_plan_ttl(env: Env, plan_id: BytesN<16>) {
        let plan = plan_mod::get_plan(&env, &plan_id).expect("Plan not found");
        plan_mod::bump_ttl(&env, &plan_id, &plan.tier);
    }

    /// Get global stats: total plans and total purchases.
    pub fn get_stats(env: Env) -> KBStatsResult {
        let total_plans: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PlanCount)
            .unwrap_or(0);
        let total_purchases: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalPurchases)
            .unwrap_or(0);
        KBStatsResult {
            total_plans,
            total_purchases,
        }
    }

    /// Get the contributor share percentage.
    pub fn get_share_pct(env: Env) -> u32 {
        get_contributor_share_pct(&env)
    }

    /// Admin-only: update operator address.
    pub fn set_operator(env: Env, new_operator: Address) {
        require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::OperatorAddress, &new_operator);
    }
}

#[cfg(test)]
mod test;
