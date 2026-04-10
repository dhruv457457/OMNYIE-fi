use crate::state::EpochStatus;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::state::*;
use crate::errors::StrataError;

#[derive(Accounts)]
pub struct CreateEpoch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [Protocol::SEED],
        bump = protocol.bump,
        has_one = authority @ StrataError::Unauthorized,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        init,
        payer = authority,
        space = 8 + Epoch::INIT_SPACE,
        seeds = [Epoch::SEED, protocol.key().as_ref(), &protocol.epoch_count.to_le_bytes()],
        bump,
    )]
    pub epoch: Account<'info, Epoch>,

    /// Epoch-specific USDC vault
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = epoch,
        token::token_program = token_program,
        seeds = [b"epoch_vault", epoch.key().as_ref()],
        bump,
    )]
    pub epoch_vault: InterfaceAccount<'info, TokenAccount>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateEpoch>,
    duration: EpochDuration,
    senior_fixed_rate_bps: u16,
    senior_cap: u64,
    junior_cap: u64,
) -> Result<()> {
    require!(!ctx.accounts.protocol.paused, StrataError::ProtocolPaused);

    let clock = Clock::get()?;
    let protocol = &mut ctx.accounts.protocol;
    let epoch = &mut ctx.accounts.epoch;

    epoch.protocol = protocol.key();
    epoch.epoch_number = protocol.epoch_count;
    epoch.duration = duration;
    epoch.status = EpochStatus::Open;
    epoch.senior_fixed_rate_bps = senior_fixed_rate_bps;
    epoch.senior_total = 0;
    epoch.junior_total = 0;
    epoch.senior_cap = senior_cap;
    epoch.junior_cap = junior_cap;
    epoch.total_yield_harvested = 0;
    epoch.senior_yield_distributed = 0;
    epoch.junior_yield_distributed = 0;
    epoch.fees_collected = 0;
    epoch.insurance_contribution = 0;
    epoch.created_at = clock.unix_timestamp;
    epoch.started_at = 0;
    epoch.matures_at = 0;
    epoch.vault_address = ctx.accounts.epoch_vault.key();
    epoch.bump = ctx.bumps.epoch;

    protocol.epoch_count += 1;

    msg!("Epoch {} created with {:?} duration, senior rate: {} bps",
        epoch.epoch_number, duration, senior_fixed_rate_bps);
    Ok(())
}
