use crate::state::EpochStatus;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::errors::StrataError;
use encrypt_anchor::EncryptContext;
use encrypt_types::encrypted::Uint64;

#[derive(Accounts)]
#[instruction(tranche_type: TrancheType)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [Protocol::SEED],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        mut,
        seeds = [Epoch::SEED, protocol.key().as_ref(), &epoch.epoch_number.to_le_bytes()],
        bump = epoch.bump,
    )]
    pub epoch: Account<'info, Epoch>,

    #[account(
        init,
        payer = user,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [
            UserPosition::SEED,
            epoch.key().as_ref(),
            user.key().as_ref(),
            &[tranche_type.clone() as u8],
        ],
        bump,
    )]
    pub position: Account<'info, UserPosition>,

    #[account(mut)]
    pub deposit_ciphertext: Signer<'info>,

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
    ctx: Context<Deposit>,
    tranche_type: TrancheType,
    amount: u64,
    encrypt_cpi_authority_bump: u8,
) -> Result<()> {
    require!(!ctx.accounts.protocol.paused, StrataError::ProtocolPaused);
    require!(amount > 0, StrataError::ZeroDeposit);

    let epoch = &ctx.accounts.epoch;
    require!(epoch.status == EpochStatus::Open, StrataError::DepositWindowClosed);

    // Check tranche caps
    match tranche_type {
        TrancheType::Senior => {
            if epoch.senior_cap > 0 {
                require!(
                    epoch.senior_total + amount <= epoch.senior_cap,
                    StrataError::TrancheCapExceeded
                );
            }
        }
        TrancheType::Junior => {
            if epoch.junior_cap > 0 {
                require!(
                    epoch.junior_total + amount <= epoch.junior_cap,
                    StrataError::TrancheCapExceeded
                );
            }
        }
    }

    // Transfer USDC from user to epoch vault
    let decimals = ctx.accounts.usdc_mint.decimals;
    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.user_usdc.to_account_info(),
                to: ctx.accounts.epoch_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
            },
        ),
        amount,
        decimals,
    )?;

    // Update epoch totals
    let epoch = &mut ctx.accounts.epoch;
    match tranche_type {
        TrancheType::Senior => epoch.senior_total += amount,
        TrancheType::Junior => epoch.junior_total += amount,
    }

    // Update protocol TVL
    let protocol = &ctx.accounts.protocol;
    // Note: TVL update happens via reload in a separate ix or cranker

    // Create user position
    let clock = Clock::get()?;
    let position = &mut ctx.accounts.position;
    position.owner = ctx.accounts.user.key();
    position.epoch = epoch.key();
    position.tranche_type = tranche_type;
    position.deposited_amount = amount;
    position.deposit_ciphertext = ctx.accounts.deposit_ciphertext.key();
    position.claimable_ciphertext = Pubkey::default();
    position.pending_decryption_digest = [0; 32];
    position.pending_decryption_request = Pubkey::default();
    position.tranche_tokens_minted = amount; // 1:1 for now
    position.yield_claimed = 0;
    position.withdrawn = false;
    position.deposited_at = clock.unix_timestamp;
    position.decryption_pending = false;
    position.bump = ctx.bumps.position;

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

    encrypt_ctx.create_plaintext_typed::<Uint64>(
        &amount,
        &ctx.accounts.deposit_ciphertext.to_account_info(),
    )?;

    msg!("Deposited {} USDC into {:?} tranche of epoch {}",
        amount, tranche_type, epoch.epoch_number);
    Ok(())
}
