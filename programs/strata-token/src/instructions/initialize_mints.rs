use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint, TokenInterface};
use crate::state::TrancheTokenConfig;

#[derive(Accounts)]
pub struct InitializeMints<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TrancheTokenConfig::INIT_SPACE,
        seeds = [TrancheTokenConfig::SEED],
        bump,
    )]
    pub config: Account<'info, TrancheTokenConfig>,

    /// Senior tranche token mint (srUSDC)
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = config,
        mint::token_program = token_program,
        seeds = [b"sr_mint"],
        bump,
    )]
    pub sr_mint: InterfaceAccount<'info, Mint>,

    /// Junior tranche token mint (jrUSDC)
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = config,
        mint::token_program = token_program,
        seeds = [b"jr_mint"],
        bump,
    )]
    pub jr_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeMints>, core_program: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.sr_mint = ctx.accounts.sr_mint.key();
    config.jr_mint = ctx.accounts.jr_mint.key();
    config.core_program = core_program;
    config.sr_total_supply = 0;
    config.jr_total_supply = 0;
    config.bump = ctx.bumps.config;

    msg!("Tranche token mints initialized. srUSDC: {}, jrUSDC: {}",
        config.sr_mint, config.jr_mint);
    Ok(())
}
