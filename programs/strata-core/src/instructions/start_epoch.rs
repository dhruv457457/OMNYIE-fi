use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::StrataError;

#[derive(Accounts)]
pub struct StartEpoch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
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

pub fn handler(ctx: Context<StartEpoch>) -> Result<()> {
    let epoch = &mut ctx.accounts.epoch;

    require!(epoch.status == EpochStatus::Open, StrataError::InvalidEpochStatus);
    require!(epoch.senior_total > 0, StrataError::NoSeniorDeposits);
    require!(epoch.junior_total > 0, StrataError::NoJuniorDeposits);

    let clock = Clock::get()?;
    epoch.status = EpochStatus::Active;
    epoch.started_at = clock.unix_timestamp;
    epoch.matures_at = clock.unix_timestamp + epoch.duration.to_seconds();

    msg!("Epoch {} started. Matures at {}", epoch.epoch_number, epoch.matures_at);
    Ok(())
}
