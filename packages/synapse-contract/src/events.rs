use soroban_sdk::{Address, BytesN, Env, String, Vec};

use crate::types::StorageTier;

pub fn emit_plan_stored(
    env: &Env,
    plan_id: &BytesN<16>,
    content_hash: &BytesN<32>,
    contributor: &Address,
    title: &String,
    tags: &Vec<String>,
    ipfs_cid: &String,
    tier: &StorageTier,
) {
    env.events().publish(
        (soroban_sdk::symbol_short!("plan_st"),),
        (
            plan_id.clone(),
            content_hash.clone(),
            contributor.clone(),
            title.clone(),
            tags.clone(),
            ipfs_cid.clone(),
            tier.clone(),
        ),
    );
}

pub fn emit_plan_purchased(
    env: &Env,
    plan_id: &BytesN<16>,
    buyer: &Address,
    amount: i128,
    contributor: &Address,
) {
    env.events().publish(
        (soroban_sdk::symbol_short!("plan_pu"),),
        (
            plan_id.clone(),
            buyer.clone(),
            amount,
            contributor.clone(),
        ),
    );
}

pub fn emit_tier_changed(
    env: &Env,
    plan_id: &BytesN<16>,
    old_tier: &StorageTier,
    new_tier: &StorageTier,
) {
    env.events().publish(
        (soroban_sdk::symbol_short!("tier_ch"),),
        (plan_id.clone(), old_tier.clone(), new_tier.clone()),
    );
}
