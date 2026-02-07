use soroban_sdk::{token, Address, BytesN, Env, Vec};

use crate::admin::{get_contributor_share_pct, get_native_token, get_operator};
use crate::plan::{get_plan, update_plan};
use crate::storage_keys::DataKey;
use crate::types::{PurchaseRecord, StorageTier};

pub fn execute_purchase(
    env: &Env,
    buyer: &Address,
    plan_id: &BytesN<16>,
    amount: i128,
) -> PurchaseRecord {
    buyer.require_auth();

    let mut plan = get_plan(env, plan_id).expect("Plan not found");

    let share_pct = get_contributor_share_pct(env) as i128;
    let contributor_share = (amount * share_pct) / 100;
    let operator_share = amount - contributor_share;

    let token_address = get_native_token(env);
    let token_client = token::Client::new(env, &token_address);
    let operator = get_operator(env);

    // Atomic: two transfers in one transaction
    token_client.transfer(buyer, &plan.contributor, &contributor_share);
    token_client.transfer(buyer, &operator, &operator_share);

    let record = PurchaseRecord {
        buyer: buyer.clone(),
        amount_stroops: amount,
        contributor_share,
        operator_share,
        ledger: env.ledger().sequence(),
    };

    // Append to purchases list
    let mut purchases: Vec<PurchaseRecord> = env
        .storage()
        .persistent()
        .get(&DataKey::Purchases(plan_id.clone()))
        .unwrap_or(Vec::new(env));
    purchases.push_back(record.clone());
    env.storage()
        .persistent()
        .set(&DataKey::Purchases(plan_id.clone()), &purchases);

    // Increment purchase count on plan
    plan.purchase_count += 1;
    // Promote to HOT on purchase
    plan.tier = StorageTier::Hot;
    update_plan(env, &plan);

    // Increment total purchases
    let total: u32 = env
        .storage()
        .instance()
        .get(&DataKey::TotalPurchases)
        .unwrap_or(0);
    env.storage()
        .instance()
        .set(&DataKey::TotalPurchases, &(total + 1));

    record
}

pub fn get_purchases(env: &Env, plan_id: &BytesN<16>) -> Vec<PurchaseRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::Purchases(plan_id.clone()))
        .unwrap_or(Vec::new(env))
}
