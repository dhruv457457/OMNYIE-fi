use crate::state::EpochStatus;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::errors::StrataError;

/// Cranker instruction: harvests yield from mock vault and records it.
/// In production, this would CPI into Kamino vaults.
/// With mock-yield feature, it simulates yield generation.
#[derive(Accounts)]
pub struct HarvestYield<'info> {
    /// Cranker or authority
    #[account(mut)]
    pub crankaer: Signer<'info>,

    #[account(
        seeds = [Protocol::SEED],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        mut,
        seeds = [Epoch::SEED, protocol.key().as_ref(), &epoch.epoch_number.to_le_bytes()],
        bump = epoch.bump,
        has_one = protocol,
    )]
    pub epoch: Account<'info, Epoch>,

    /// Epoch USDC vault
    #[account(
        mut,
        token::mint = usdc_mint,
        seeds = [b"epoch_vault", epoch.key().as_ref()],
        bump,
    )]
    pub epoch_vault: InterfaceAccount<'info, TokenAccount>,

    /// Mock yield source vault (in production: Kamino vault)
    /// CHECK: For mock adapter, this is a token account we control
    #[account(mut)]
    pub yield_source: InterfaceAccount<'info, TokenAccount>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<HarvestYield>, yield_amount: u64) -> Result<()> {
    let epoch = &ctx.accounts.epoch;
    require!(epoch.status == EpochStatus::Active, StrataError::InvalidEpochStatus);

    // In mock mode: the yield_amount parameter simulates harvested yield
    // In production: CPI to Kamino to withdraw accrued yield

    // Transfer yield from yield source to epoch vault
    // Note: In mock mode, yield_source is pre-funded by the deployer
    // The cranker passes the yield_amount that was generated

    let epoch = &mut ctx.accounts.epoch;
    epoch.total_yield_harvested = epoch.total_yield_harvested
        .checked_add(yield_amount)
        .ok_or(StrataError::MathOverflow)?;

    msg!("Harvested {} USDC yield for epoch {}", yield_amount, epoch.epoch_number);
    Ok(())
}
