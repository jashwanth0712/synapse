use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, BytesN, Env, String, Vec,
};

use crate::types::StorePlanInput;
use crate::{SynapseContract, SynapseContractClient};

fn setup_env() -> (Env, SynapseContractClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SynapseContract, ());
    let client = SynapseContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let native_token = env.register_stellar_asset_contract_v2(admin.clone()).address();

    client.initialize(&admin, &operator, &70u32, &native_token);

    (env, client, admin, operator, native_token)
}

fn make_plan_id(env: &Env, val: u8) -> BytesN<16> {
    let mut bytes = [0u8; 16];
    bytes[0] = val;
    BytesN::from_array(env, &bytes)
}

fn make_content_hash(env: &Env, val: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[0] = val;
    BytesN::from_array(env, &bytes)
}

fn make_input(env: &Env, id: BytesN<16>, hash: BytesN<32>, title: &str, score: u32) -> StorePlanInput {
    StorePlanInput {
        id,
        title: String::from_str(env, title),
        description: String::from_str(env, "Description"),
        content_hash: hash,
        ipfs_cid: String::from_str(env, "QmTestCid"),
        tags: Vec::new(env),
        domain: String::from_str(env, ""),
        language: String::from_str(env, ""),
        framework: String::from_str(env, ""),
        quality_score: score,
    }
}

#[test]
fn test_initialize() {
    let (_env, client, _admin, _operator, _native_token) = setup_env();

    let stats = client.get_stats();
    assert_eq!(stats.total_plans, 0);
    assert_eq!(stats.total_purchases, 0);
    assert_eq!(client.get_share_pct(), 70);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize() {
    let (env, client, _admin, _operator, _native_token) = setup_env();
    let admin2 = Address::generate(&env);
    let op2 = Address::generate(&env);
    let tok2 = Address::generate(&env);
    client.initialize(&admin2, &op2, &50u32, &tok2);
}

#[test]
fn test_store_and_get_plan() {
    let (env, client, _admin, _operator, _native_token) = setup_env();
    let contributor = Address::generate(&env);
    let plan_id = make_plan_id(&env, 1);
    let content_hash = make_content_hash(&env, 1);

    env.ledger().set(LedgerInfo {
        timestamp: 1700000000,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10_000_000,
    });

    let input = StorePlanInput {
        id: plan_id.clone(),
        title: String::from_str(&env, "Test Plan"),
        description: String::from_str(&env, "A test plan description"),
        content_hash,
        ipfs_cid: String::from_str(&env, "QmTest123"),
        tags: Vec::from_array(&env, [String::from_str(&env, "rust"), String::from_str(&env, "soroban")]),
        domain: String::from_str(&env, "blockchain"),
        language: String::from_str(&env, "rust"),
        framework: String::from_str(&env, "soroban-sdk"),
        quality_score: 85,
    };

    client.store_plan(&contributor, &input);

    let plan = client.get_plan(&plan_id).unwrap();
    assert_eq!(plan.quality_score, 85);
    assert_eq!(plan.purchase_count, 0);
    assert_eq!(plan.created_at, 1700000000);

    let stats = client.get_stats();
    assert_eq!(stats.total_plans, 1);
}

#[test]
fn test_content_exists() {
    let (env, client, _admin, _operator, _native_token) = setup_env();
    let contributor = Address::generate(&env);
    let plan_id = make_plan_id(&env, 2);
    let content_hash = make_content_hash(&env, 2);

    assert!(!client.content_exists(&content_hash));

    let input = make_input(&env, plan_id, content_hash.clone(), "Plan 2", 50);
    client.store_plan(&contributor, &input);

    assert!(client.content_exists(&content_hash));
}

#[test]
#[should_panic(expected = "Content with this hash already exists")]
fn test_duplicate_content() {
    let (env, client, _admin, _operator, _native_token) = setup_env();
    let contributor = Address::generate(&env);
    let content_hash = make_content_hash(&env, 3);

    let input1 = make_input(&env, make_plan_id(&env, 3), content_hash.clone(), "Plan A", 50);
    let input2 = make_input(&env, make_plan_id(&env, 4), content_hash, "Plan B", 50);

    client.store_plan(&contributor, &input1);
    client.store_plan(&contributor, &input2);
}

#[test]
fn test_contributor_plans() {
    let (env, client, _admin, _operator, _native_token) = setup_env();
    let contributor = Address::generate(&env);

    let input1 = make_input(&env, make_plan_id(&env, 10), make_content_hash(&env, 10), "P1", 80);
    let input2 = make_input(&env, make_plan_id(&env, 11), make_content_hash(&env, 11), "P2", 90);

    client.store_plan(&contributor, &input1);
    client.store_plan(&contributor, &input2);

    let plans = client.get_contributor_plans(&contributor);
    assert_eq!(plans.len(), 2);
}

#[test]
fn test_purchase_plan() {
    let (env, client, _admin, _operator, native_token) = setup_env();
    let contributor = Address::generate(&env);
    let buyer = Address::generate(&env);

    // Mint tokens to buyer using the SAC admin
    let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &native_token);
    token_admin_client.mint(&buyer, &10_000_000_i128); // 1 XLM

    let plan_id = make_plan_id(&env, 20);
    let input = make_input(&env, plan_id.clone(), make_content_hash(&env, 20), "Buyable", 70);
    client.store_plan(&contributor, &input);

    let record = client.purchase_plan(&buyer, &plan_id, &10_000_000_i128);
    assert_eq!(record.contributor_share, 7_000_000);
    assert_eq!(record.operator_share, 3_000_000);

    // Check plan purchase count incremented
    let plan = client.get_plan(&plan_id).unwrap();
    assert_eq!(plan.purchase_count, 1);

    // Check purchase history
    let purchases = client.get_purchases(&plan_id);
    assert_eq!(purchases.len(), 1);

    let stats = client.get_stats();
    assert_eq!(stats.total_purchases, 1);

    // Check token balances
    let token_client = soroban_sdk::token::Client::new(&env, &native_token);
    assert_eq!(token_client.balance(&contributor), 7_000_000);
    assert_eq!(token_client.balance(&buyer), 0);
}

#[test]
fn test_set_tier() {
    let (env, client, _admin, _operator, _native_token) = setup_env();
    let contributor = Address::generate(&env);
    let plan_id = make_plan_id(&env, 30);
    let input = make_input(&env, plan_id.clone(), make_content_hash(&env, 30), "Tiered", 60);
    client.store_plan(&contributor, &input);

    let plan = client.get_plan(&plan_id).unwrap();
    assert_eq!(plan.tier, crate::types::StorageTier::Hot);

    client.set_tier(&contributor, &plan_id, &crate::types::StorageTier::Cold);

    let plan = client.get_plan(&plan_id).unwrap();
    assert_eq!(plan.tier, crate::types::StorageTier::Cold);
}
