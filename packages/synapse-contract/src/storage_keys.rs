use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    // Instance storage
    Admin,
    OperatorAddress,
    ContributorSharePct,
    PlanCount,
    TotalPurchases,
    NativeTokenAddress,
    // Persistent storage
    Plan(BytesN<16>),
    ContentHash(BytesN<32>),
    Purchases(BytesN<16>),
    ContribPlans(Address),
}
