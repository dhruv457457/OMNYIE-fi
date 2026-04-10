use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TrancheTokenConfig {
    /// Protocol authority
    pub authority: Pubkey,
    /// Senior tranche mint (srUSDC)
    pub sr_mint: Pubkey,
    /// Junior tranche mint (jrUSDC)
    pub jr_mint: Pubkey,
    /// strata_core program ID (authorized to request mints/burns)
    pub core_program: Pubkey,
    /// Total srUSDC minted
    pub sr_total_supply: u64,
    /// Total jrUSDC minted
    pub jr_total_supply: u64,
    /// Bump
    pub bump: u8,
}

impl TrancheTokenConfig {
    pub const SEED: &'static [u8] = b"tranche_config";
}
