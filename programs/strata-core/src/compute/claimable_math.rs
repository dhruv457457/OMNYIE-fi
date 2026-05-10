use encrypt_dsl::prelude::*;
use encrypt_types::encrypted::EUint64;

#[encrypt_fn]
pub fn calculate_claimable(
    principal: EUint64,
    yield_distributed: EUint64,
    tranche_total: EUint64,
) -> EUint64 {
    let proportion = principal * yield_distributed / tranche_total;
    principal + proportion
}

#[encrypt_fn]
pub fn calculate_compound_claimable(
    current_claimable: EUint64,
    yield_distributed: EUint64,
    tranche_total: EUint64,
) -> EUint64 {
    let proportion = current_claimable * yield_distributed / tranche_total;
    current_claimable + proportion
}

#[encrypt_fn]
pub fn calculate_junior_claimable(
    principal: EUint64,
    total_yield: EUint64,
    senior_yield: EUint64,
    performance_fee: EUint64,
    insurance_fee: EUint64,
    tranche_total: EUint64,
) -> EUint64 {
    let remaining = if total_yield > senior_yield {
        total_yield - senior_yield
    } else {
        principal - principal
    };
    
    let after_fees = remaining - performance_fee - insurance_fee;
    
    let proportion = principal * after_fees / tranche_total;
    principal + proportion
}

#[encrypt_fn]
pub fn sum_claims(
    claim1: EUint64,
    claim2: EUint64,
) -> EUint64 {
    claim1 + claim2
}

#[encrypt_fn]
pub fn batch_sum(
    claim1: EUint64,
    claim2: EUint64,
    claim3: EUint64,
    claim4: EUint64,
) -> EUint64 {
    claim1 + claim2 + claim3 + claim4
}
