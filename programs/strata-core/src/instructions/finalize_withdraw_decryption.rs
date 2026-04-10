use crate::errors::StrataError;
use crate::instructions::withdraw::calculate_withdrawal_amount;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use encrypt_anchor::{accounts::decryption_status, accounts::read_decrypted_verified, EncryptContext};
use encrypt_anchor::accounts::DecryptionRequestStatus;
use encrypt_types::encrypted::Uint64;

#[derive(Accounts)]
pub struct FinalizeWithdrawDecryption<'info> {
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

    /// CHECK: completed decryption request account
    #[account(mut)]
    pub decryption_request: UncheckedAccount<'info>,
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

    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<FinalizeWithdrawDecryption>,
    encrypt_cpi_authority_bump: u8,
) -> Result<()> {
    let position = &ctx.accounts.position;
    require!(!position.withdrawn, StrataError::AlreadyWithdrawn);
    require!(position.decryption_pending, StrataError::DecryptionPending);
    require_keys_eq!(
        position.pending_decryption_request,
        ctx.accounts.decryption_request.key(),
        StrataError::InvalidEncryptAccounts
    );

    let req_data = ctx.accounts.decryption_request.try_borrow_data()?;
    match decryption_status::<Uint64>(&req_data) {
        Ok(DecryptionRequestStatus::Complete { .. }) => {}
        _ => return err!(StrataError::DecryptionNotComplete),
    }

    let decrypted_amount = *read_decrypted_verified::<Uint64>(
        &req_data,
        &position.pending_decryption_digest,
    )
    .map_err(|_| StrataError::DecryptionNotComplete)?;
    drop(req_data);

    let epoch = &ctx.accounts.epoch;
    let protocol = &ctx.accounts.protocol;
    let (withdraw_amount, yield_amount) = calculate_withdrawal_amount(
        decrypted_amount,
        position.tranche_type,
        epoch,
        protocol,
    )?;

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

    encrypt_ctx.close_decryption_request(
        &ctx.accounts.decryption_request.to_account_info(),
        &ctx.accounts.user.to_account_info(),
    )?;

    let position = &mut ctx.accounts.position;
    position.withdrawn = true;
    position.yield_claimed = yield_amount;
    position.decryption_pending = false;
    position.pending_decryption_digest = [0; 32];
    position.pending_decryption_request = Pubkey::default();

    msg!(
        "Finalized encrypted withdrawal {} USDC (principal: {}, yield: {})",
        withdraw_amount,
        decrypted_amount,
        yield_amount
    );
    Ok(())
}
