use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, MintTo};
use crate::state::TrancheTokenConfig;
use crate::errors::TokenError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]  // ← Added Debug
pub enum TrancheType {
    Senior,
    Junior,
}

#[derive(Accounts)]
#[instruction(tranche_type: TrancheType)]
pub struct MintTranche<'info> {
    /// Can be the core program PDA or the authority
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [TrancheTokenConfig::SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, TrancheTokenConfig>,

    /// Mint to use (sr_mint or jr_mint based on tranche_type)
    #[account(mut)]
    pub tranche_mint: InterfaceAccount<'info, Mint>,

    /// User's tranche token account
    #[account(
        mut,
        token::mint = tranche_mint,
    )]
    pub user_tranche_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<MintTranche>, tranche_type: TrancheType, amount: u64) -> Result<()> {
    require!(amount > 0, TokenError::ZeroAmount);

    let config = &ctx.accounts.config;

    // Verify caller is authorized (core program or authority)
    require!(
        ctx.accounts.caller.key() == config.core_program
            || ctx.accounts.caller.key() == config.authority,
        TokenError::Unauthorized
    );

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

    // Mint tranche tokens to user
    let config_seeds = &[
        TrancheTokenConfig::SEED,
        &[config.bump],
    ];
    let signer_seeds = &[&config_seeds[..]];

    token_interface::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.tranche_mint.to_account_info(),
                to: ctx.accounts.user_tranche_account.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    // Update supply tracking
    let config = &mut ctx.accounts.config;
    match tranche_type {
        TrancheType::Senior => config.sr_total_supply += amount,
        TrancheType::Junior => config.jr_total_supply += amount,
    }

    msg!("Minted {} {:?} tranche tokens", amount, tranche_type);
    Ok(())
}
