use crate::errors::StrataError;
use crate::state::*;
use anchor_lang::prelude::*;
use encrypt_anchor::EncryptContext;

#[derive(Accounts)]
pub struct RequestWithdrawDecryption<'info> {
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
        has_one = epoch,
    )]
    pub position: Account<'info, UserPosition>,

    #[account(mut)]
    pub decryption_request: Signer<'info>,
    /// CHECK: ciphertext storing the private balance for this position
    pub balance_ciphertext: UncheckedAccount<'info>,
    /// CHECK: Encrypt program account
    pub encrypt_program: UncheckedAccount<'info>,
    /// CHECK: Encrypt config account
    pub encrypt_config: UncheckedAccount<'info>,
    /// CHECK: Encrypt fee deposit account
    #[account(mut)]
    pub encrypt_deposit: UncheckedAccount<'info>,
    /// CHECK: CPI authority PDA used for Encrypt calls
    pub encrypt_cpi_authority: UncheckedAccount<'info>,
    /// CHECK: This program account for Encrypt CPI
    pub caller_program: UncheckedAccount<'info>,
    /// CHECK: Encrypt network encryption key
    pub network_encryption_key: UncheckedAccount<'info>,
    /// CHECK: Encrypt event authority
    pub encrypt_event_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RequestWithdrawDecryption>,
    encrypt_cpi_authority_bump: u8,
) -> Result<()> {
    let position = &ctx.accounts.position;
    require!(
        position.deposit_ciphertext != Pubkey::default(),
        StrataError::MissingEncryptedBalance
    );
    require_keys_eq!(
        position.deposit_ciphertext,
        ctx.accounts.balance_ciphertext.key(),
        StrataError::InvalidEncryptAccounts
    );

    let encrypt_ctx = EncryptContext {
        encrypt_program: ctx.accounts.encrypt_program.to_account_info(),
        config: ctx.accounts.encrypt_config.to_account_info(),
        deposit: ctx.accounts.encrypt_deposit.to_account_info(),
        cpi_authority: ctx.accounts.encrypt_cpi_authority.to_account_info(),
        caller_program: ctx.accounts.caller_program.to_account_info(),
        network_encryption_key: ctx.accounts.network_encryption_key.to_account_info(),
        payer: ctx.accounts.user.to_account_info(),
        event_authority: ctx.accounts.encrypt_event_authority.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        cpi_authority_bump: encrypt_cpi_authority_bump,
    };

    let digest = encrypt_ctx.request_decryption(
        &ctx.accounts.decryption_request.to_account_info(),
        &ctx.accounts.balance_ciphertext.to_account_info(),
    )?;

    let position = &mut ctx.accounts.position;
    position.pending_decryption_digest = digest;
    position.pending_decryption_request = ctx.accounts.decryption_request.key();
    position.decryption_pending = true;

    Ok(())
}
