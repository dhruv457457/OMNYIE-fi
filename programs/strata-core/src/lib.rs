use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod adapters;

use instructions::*;
use state::*;

declare_id!("Gu9BtKAQ7dHZhig9Z3aESR9hR7xcWTjjGeAN6bHZCBvX");

#[program]
pub mod strata_core {
    use super::*;

    /// Initialize the Strata Finance protocol
    pub fn initialize(
        ctx: Context<Initialize>,
        sr_mint: Pubkey,
        jr_mint: Pubkey,
        token_program_id: Pubkey,
        performance_fee_bps: u16,
        early_withdrawal_fee_bps: u16,
        insurance_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize::handler(
            ctx,
            sr_mint,
            jr_mint,
            token_program_id,
            performance_fee_bps,
            early_withdrawal_fee_bps,
            insurance_fee_bps,
        )
    }

    /// Create a new epoch (yield period)
    pub fn create_epoch(
        ctx: Context<CreateEpoch>,
        duration: EpochDuration,
        senior_fixed_rate_bps: u16,
        senior_cap: u64,
        junior_cap: u64,
    ) -> Result<()> {
        instructions::create_epoch::handler(ctx, duration, senior_fixed_rate_bps, senior_cap, junior_cap)
    }

    /// Deposit USDC into a tranche
    pub fn deposit(
        ctx: Context<Deposit>,
        tranche_type: TrancheType,
        amount: u64,
        encrypt_cpi_authority_bump: u8,
    ) -> Result<()> {
        instructions::deposit::handler(ctx, tranche_type, amount, encrypt_cpi_authority_bump)
    }

    /// Start an epoch (close deposits, begin yield generation)
    pub fn start_epoch(ctx: Context<StartEpoch>) -> Result<()> {
        instructions::start_epoch::handler(ctx)
    }

    /// Harvest yield from underlying protocol (cranker)
    pub fn harvest_yield(ctx: Context<HarvestYield>, yield_amount: u64) -> Result<()> {
        instructions::harvest_yield::handler(ctx, yield_amount)
    }

    /// Distribute yield between tranches after epoch matures
    pub fn distribute_yield(ctx: Context<DistributeYield>) -> Result<()> {
        instructions::distribute_yield::handler(ctx)
    }

    /// Withdraw principal + yield after epoch matures
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::withdraw::handler(ctx)
    }

    /// Request decryption of a private position amount before withdrawal settlement.
    pub fn request_withdraw_decryption(
        ctx: Context<RequestWithdrawDecryption>,
        encrypt_cpi_authority_bump: u8,
    ) -> Result<()> {
        instructions::request_withdraw_decryption::handler(ctx, encrypt_cpi_authority_bump)
    }

    /// Finalize an encrypted withdrawal after the decryption request completes.
    pub fn finalize_withdraw_decryption(
        ctx: Context<FinalizeWithdrawDecryption>,
        encrypt_cpi_authority_bump: u8,
    ) -> Result<()> {
        instructions::finalize_withdraw_decryption::handler(ctx, encrypt_cpi_authority_bump)
    }

    /// Devnet/demo helper: authority-only fast-forward for testing withdrawal UX.
    /// Remove or gate this before any production deployment.
    pub fn force_mature_epoch(
        ctx: Context<ForceMatureEpoch>,
        additional_yield: u64,
    ) -> Result<()> {
        instructions::force_mature_epoch::handler(ctx, additional_yield)
    }
}
