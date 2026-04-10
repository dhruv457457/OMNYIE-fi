use anchor_lang::prelude::*;

#[error_code]
pub enum TokenError {
    #[msg("Unauthorized: caller is not the core program or authority")]
    Unauthorized,
    #[msg("Invalid tranche type")]
    InvalidTrancheType,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
}
