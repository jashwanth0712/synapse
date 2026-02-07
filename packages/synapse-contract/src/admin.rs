use soroban_sdk::{Address, Env};

use crate::storage_keys::DataKey;

pub fn require_admin(env: &Env) -> Address {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    admin.require_auth();
    admin
}

pub fn get_operator(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::OperatorAddress)
        .unwrap()
}

pub fn get_contributor_share_pct(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::ContributorSharePct)
        .unwrap()
}

pub fn get_native_token(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::NativeTokenAddress)
        .unwrap()
}
