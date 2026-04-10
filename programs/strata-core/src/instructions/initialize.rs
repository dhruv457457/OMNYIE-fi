use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::state::Protocol;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::INIT_SPACE,
        seeds = [Protocol::SEED],
        bump,
    )]
    pub protocol: Account<'info, Protocol>,

    /// USDC mint
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    /// Protocol USDC vault to hold deposits
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = protocol,
        token::token_program = token_program,
        seeds = [b"vault", Protocol::SEED],
        bump,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// Treasury wallet for fees
    /// CHECK: Just stores the address, validated by authority
    pub treasury: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    sr_mint: Pubkey,
    jr_mint: Pubkey,
    token_program_id: Pubkey,
    performance_fee_bps: u16,
    early_withdrawal_fee_bps: u16,
    insurance_fee_bps: u16,
) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;

    protocol.authority = ctx.accounts.authority.key();
    protocol.treasury = ctx.accounts.treasury.key();
    protocol.usdc_mint = ctx.accounts.usdc_mint.key();
    protocol.sr_mint = sr_mint;
    protocol.jr_mint = jr_mint;
    protocol.token_program_id = token_program_id;
    protocol.performance_fee_bps = performance_fee_bps;
    protocol.early_withdrawal_fee_bps = early_withdrawal_fee_bps;
    protocol.insurance_fee_bps = insurance_fee_bps;
    protocol.insurance_fund = 0;
    protocol.epoch_count = 0;
    protocol.total_tvl = 0;
    protocol.paused = false;
    protocol.bump = ctx.bumps.protocol;

    msg!("Strata Finance protocol initialized");
    Ok(())
}
