use crate::errors::StrataError;
use crate::state::*;
use anchor_lang::prelude::*;

/// Devnet/demo helper: authority-only fast-forward for testing withdrawal UX.
/// Remove or gate this before any production deployment.
#[derive(Accounts)]
pub struct ForceMatureEpoch<'info> {
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

pub fn handler(ctx: Context<ForceMatureEpoch>, additional_yield: u64) -> Result<()> {
    let epoch = &ctx.accounts.epoch;
    require!(
        epoch.status == EpochStatus::Open || epoch.status == EpochStatus::Active,
        StrataError::InvalidEpochStatus
    );

    let total_yield = epoch
        .total_yield_harvested
        .checked_add(additional_yield)
        .ok_or(StrataError::MathOverflow)?;

    let protocol = &ctx.accounts.protocol;
    let (senior_yield, junior_yield, total_fees) = epoch.calculate_junior_yield(
        total_yield,
        protocol.performance_fee_bps,
        protocol.insurance_fee_bps,
    );

    let insurance_portion = if total_fees == 0 {
        0
    } else {
        (total_fees as u128)
            .checked_mul(protocol.insurance_fee_bps as u128)
            .ok_or(StrataError::MathOverflow)?
            .checked_div((protocol.performance_fee_bps + protocol.insurance_fee_bps) as u128)
            .unwrap_or(0) as u64
    };
    let platform_fee = total_fees.saturating_sub(insurance_portion);

    let clock = Clock::get()?;
    let epoch = &mut ctx.accounts.epoch;
    epoch.total_yield_harvested = total_yield;
    epoch.senior_yield_distributed = senior_yield;
    epoch.junior_yield_distributed = junior_yield;
    epoch.fees_collected = platform_fee;
    epoch.insurance_contribution = insurance_portion;
    epoch.started_at = if epoch.started_at == 0 {
        clock.unix_timestamp
    } else {
        epoch.started_at
    };
    epoch.matures_at = clock.unix_timestamp;
    epoch.status = EpochStatus::Matured;

    let protocol = &mut ctx.accounts.protocol;
    protocol.insurance_fund = protocol
        .insurance_fund
        .checked_add(insurance_portion)
        .ok_or(StrataError::MathOverflow)?;

    msg!(
        "Force matured epoch {}. Senior yield: {}, Junior yield: {}, Fees: {}, Insurance: {}",
        epoch.epoch_number,
        senior_yield,
        junior_yield,
        platform_fee,
        insurance_portion
    );
    Ok(())
}
