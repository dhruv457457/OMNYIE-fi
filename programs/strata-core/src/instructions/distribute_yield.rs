use crate::state::EpochStatus;
use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::StrataError;

/// Called after epoch matures. Calculates and records yield split
/// between senior and junior tranches.
#[derive(Accounts)]
pub struct DistributeYield<'info> {
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
        mut,
        seeds = [Epoch::SEED, protocol.key().as_ref(), &epoch.epoch_number.to_le_bytes()],
        bump = epoch.bump,
        has_one = protocol,
    )]
    pub epoch: Account<'info, Epoch>,
}

pub fn handler(ctx: Context<DistributeYield>) -> Result<()> {
    let epoch = &ctx.accounts.epoch;
    let clock = Clock::get()?;

    require!(
        epoch.status == EpochStatus::Active,
        StrataError::InvalidEpochStatus
    );
    require!(
        clock.unix_timestamp >= epoch.matures_at,
        StrataError::EpochNotMatured
    );

    let protocol = &ctx.accounts.protocol;
    let total_yield = epoch.total_yield_harvested;

    let (senior_yield, junior_yield, total_fees) = epoch.calculate_junior_yield(
        total_yield,
        protocol.performance_fee_bps,
        protocol.insurance_fee_bps,
    );

    // Calculate fee split
    let insurance_portion = (total_fees as u128)
        .checked_mul(protocol.insurance_fee_bps as u128)
        .unwrap()
        .checked_div((protocol.performance_fee_bps + protocol.insurance_fee_bps) as u128)
        .unwrap_or(0) as u64;
    let platform_fee = total_fees.saturating_sub(insurance_portion);

    // Update epoch
    let epoch = &mut ctx.accounts.epoch;
    epoch.senior_yield_distributed = senior_yield;
    epoch.junior_yield_distributed = junior_yield;
    epoch.fees_collected = platform_fee;
    epoch.insurance_contribution = insurance_portion;
    epoch.status = EpochStatus::Matured;

    // Update protocol
    let protocol = &mut ctx.accounts.protocol;
    protocol.insurance_fund = protocol.insurance_fund
        .checked_add(insurance_portion)
        .ok_or(StrataError::MathOverflow)?;

    msg!(
        "Epoch {} matured. Senior yield: {}, Junior yield: {}, Fees: {}, Insurance: {}",
        epoch.epoch_number, senior_yield, junior_yield, platform_fee, insurance_portion
    );
    Ok(())
}
