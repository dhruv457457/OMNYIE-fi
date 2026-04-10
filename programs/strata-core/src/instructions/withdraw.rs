use crate::state::EpochStatus;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::errors::StrataError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [Protocol::SEED],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        seeds = [Epoch::SEED, protocol.key().as_ref(), &epoch.epoch_number.to_le_bytes()],
        bump = epoch.bump,
        has_one = protocol,
    )]
    pub epoch: Account<'info, Epoch>,

    #[account(
        mut,
        seeds = [
            UserPosition::SEED,
            epoch.key().as_ref(),
            user.key().as_ref(),
            &[position.tranche_type as u8],
        ],
        bump = position.bump,
        has_one = owner @ StrataError::Unauthorized,
        has_one = epoch,
    )]
    pub position: Account<'info, UserPosition>,

    /// CHECK: validated by position.owner
    pub owner: UncheckedAccount<'info>,

    /// User's USDC token account
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = user,
    )]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,

    /// Epoch USDC vault
    #[account(
        mut,
        token::mint = usdc_mint,
        seeds = [b"epoch_vault", epoch.key().as_ref()],
        bump,
    )]
    pub epoch_vault: InterfaceAccount<'info, TokenAccount>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn calculate_withdrawal_amount(
    principal_amount: u64,
    tranche_type: TrancheType,
    epoch: &Epoch,
    protocol: &Protocol,
) -> Result<(u64, u64)> {
    let mut withdraw_amount = principal_amount;
    let mut yield_amount: u64 = 0;

    if epoch.status == EpochStatus::Matured {
        let tranche_total = match tranche_type {
            TrancheType::Senior => epoch.senior_total,
            TrancheType::Junior => epoch.junior_total,
        };

        let yield_distributed = match tranche_type {
            TrancheType::Senior => epoch.senior_yield_distributed,
            TrancheType::Junior => epoch.junior_yield_distributed,
        };

        if tranche_total > 0 {
            yield_amount = (yield_distributed as u128)
                .checked_mul(principal_amount as u128)
                .unwrap()
                .checked_div(tranche_total as u128)
                .unwrap_or(0) as u64;
        }

        withdraw_amount = withdraw_amount
            .checked_add(yield_amount)
            .ok_or(StrataError::MathOverflow)?;
    } else if epoch.status == EpochStatus::Active {
        let fee = (principal_amount as u128)
            .checked_mul(protocol.early_withdrawal_fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        withdraw_amount = withdraw_amount.saturating_sub(fee);
    }

    Ok((withdraw_amount, yield_amount))
}

pub fn handler(ctx: Context<Withdraw>) -> Result<()> {
    let position = &ctx.accounts.position;
    let epoch = &ctx.accounts.epoch;
    let protocol = &ctx.accounts.protocol;

    require!(!position.withdrawn, StrataError::AlreadyWithdrawn);
    let (withdraw_amount, yield_amount) = calculate_withdrawal_amount(
        position.deposited_amount,
        position.tranche_type,
        epoch,
        protocol,
    )?;

    // Transfer from epoch vault to user using the epoch PDA as the vault authority.
    let protocol_key = protocol.key();
    let epoch_number = epoch.epoch_number.to_le_bytes();
    let seeds = &[
        Epoch::SEED,
        protocol_key.as_ref(),
        epoch_number.as_ref(),
        &[epoch.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let decimals = ctx.accounts.usdc_mint.decimals;
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.epoch_vault.to_account_info(),
                to: ctx.accounts.user_usdc.to_account_info(),
                authority: ctx.accounts.epoch.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
            },
            signer_seeds,
        ),
        withdraw_amount,
        decimals,
    )?;

    // Mark position as withdrawn
    let position = &mut ctx.accounts.position;
    position.withdrawn = true;
    position.yield_claimed = yield_amount;
    position.decryption_pending = false;
    position.pending_decryption_digest = [0; 32];
    position.pending_decryption_request = Pubkey::default();

    msg!("Withdrew {} USDC (principal: {}, yield: {}) from epoch",
        withdraw_amount, position.deposited_amount, yield_amount);
    msg!("Fallback-safe settlement complete; Encrypt decryption is optional for UX, not required for redemption.");
    Ok(())
}
