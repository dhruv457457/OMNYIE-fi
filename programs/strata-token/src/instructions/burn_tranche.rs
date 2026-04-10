use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, Burn};
use crate::state::TrancheTokenConfig;
use crate::errors::TokenError;
use super::mint_tranche::TrancheType;

#[derive(Accounts)]
#[instruction(tranche_type: TrancheType)]
pub struct BurnTranche<'info> {
    /// User burning their tranche tokens
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [TrancheTokenConfig::SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, TrancheTokenConfig>,

    /// Tranche mint to burn from
    #[account(mut)]
    pub tranche_mint: InterfaceAccount<'info, Mint>,

    /// User's tranche token account
    #[account(
        mut,
        token::mint = tranche_mint,
        token::authority = user,
    )]
    pub user_tranche_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<BurnTranche>, tranche_type: TrancheType, amount: u64) -> Result<()> {
    require!(amount > 0, TokenError::ZeroAmount);

    let config = &ctx.accounts.config;

    // Verify correct mint
    match tranche_type {
        TrancheType::Senior => {
            require!(
                ctx.accounts.tranche_mint.key() == config.sr_mint,
                TokenError::InvalidTrancheType
            );
        }
        TrancheType::Junior => {
            require!(
                ctx.accounts.tranche_mint.key() == config.jr_mint,
                TokenError::InvalidTrancheType
            );
        }
    }

    // Burn tranche tokens
    token_interface::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.tranche_mint.to_account_info(),
                from: ctx.accounts.user_tranche_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update supply tracking
    let config = &mut ctx.accounts.config;
    match tranche_type {
        TrancheType::Senior => config.sr_total_supply = config.sr_total_supply.saturating_sub(amount),
        TrancheType::Junior => config.jr_total_supply = config.jr_total_supply.saturating_sub(amount),
    }

    msg!("Burned {} {:?} tranche tokens", amount, tranche_type);
    Ok(())
}
