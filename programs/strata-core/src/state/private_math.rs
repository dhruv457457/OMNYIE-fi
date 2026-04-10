use encrypt_dsl::prelude::*;

#[encrypt_fn]
pub fn identity_amount(amount: EUint64) -> EUint64 {
    amount
}
