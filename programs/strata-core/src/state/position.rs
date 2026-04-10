use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum TrancheType {
    Senior,
    Junior,
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    /// The user who owns this position
    pub owner: Pubkey,
    /// The epoch this position belongs to
    pub epoch: Pubkey,
    /// Senior or Junior tranche
    pub tranche_type: TrancheType,
    /// USDC amount deposited
    pub deposited_amount: u64,
    /// Encrypt ciphertext account storing the private deposited amount
    pub deposit_ciphertext: Pubkey,
    /// Encrypt ciphertext account storing a private claimable amount, when available
    pub claimable_ciphertext: Pubkey,
    /// Digest snapshot returned when decryption is requested
    pub pending_decryption_digest: [u8; 32],
    /// Active decryption request account, if any
    pub pending_decryption_request: Pubkey,
    /// Tranche tokens (srUSDC or jrUSDC) minted to user
    pub tranche_tokens_minted: u64,
    /// Yield claimed so far
    pub yield_claimed: u64,
    /// Whether principal has been withdrawn
    pub withdrawn: bool,
    /// Timestamp of deposit
    pub deposited_at: i64,
    /// Whether a decryption request is currently outstanding
    pub decryption_pending: bool,
    /// Bump seed
    pub bump: u8,
}

impl UserPosition {
    pub const SEED: &'static [u8] = b"position";
}
