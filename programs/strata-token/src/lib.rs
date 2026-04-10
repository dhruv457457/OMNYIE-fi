use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("BHEacctLwvbEs8NSDEUC8AGPDCK3VvTrXL6snkvV3uzn");

#[program]
pub mod strata_token {
    use super::*;

    /// Initialize srUSDC and jrUSDC mints
    pub fn initialize_mints(ctx: Context<InitializeMints>, core_program: Pubkey) -> Result<()> {
        instructions::initialize_mints::handler(ctx, core_program)
    }

    /// Mint tranche tokens to a user (called after deposit)
    pub fn mint_tranche(
        ctx: Context<MintTranche>,
        tranche_type: mint_tranche::TrancheType,
        amount: u64,
    ) -> Result<()> {
        instructions::mint_tranche::handler(ctx, tranche_type, amount)
    }

    /// Burn tranche tokens from a user (called on withdrawal)
    pub fn burn_tranche(
        ctx: Context<BurnTranche>,
        tranche_type: mint_tranche::TrancheType,
        amount: u64,
    ) -> Result<()> {
        instructions::burn_tranche::handler(ctx, tranche_type, amount)
    }
}
