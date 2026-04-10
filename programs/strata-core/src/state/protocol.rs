use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Protocol {
    /// Authority that can update protocol parameters
    pub authority: Pubkey,
    /// Treasury wallet receiving platform fees
    pub treasury: Pubkey,
    /// USDC mint address
    pub usdc_mint: Pubkey,
    /// Senior tranche token mint (srUSDC)
    pub sr_mint: Pubkey,
    /// Junior tranche token mint (jrUSDC)
    pub jr_mint: Pubkey,
    /// Strata token program (strata_token) ID
    pub token_program_id: Pubkey,
    /// Performance fee in basis points (500 = 5%)
    pub performance_fee_bps: u16,
    /// Early withdrawal fee in basis points (100 = 1%)
    pub early_withdrawal_fee_bps: u16,
    /// Insurance fund fee in basis points (50 = 0.5%)
    pub insurance_fee_bps: u16,
    /// Total USDC in insurance fund
    pub insurance_fund: u64,
    /// Total epochs created
    pub epoch_count: u64,
    /// Total value locked across all epochs
    pub total_tvl: u64,
    /// Protocol paused flag
    pub paused: bool,
    /// Bump seed for PDA
    pub bump: u8,
}

impl Protocol {
    pub const SEED: &'static [u8] = b"protocol";
}
