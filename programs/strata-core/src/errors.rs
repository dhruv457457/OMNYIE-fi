use anchor_lang::prelude::*;

#[error_code]
pub enum StrataError {
    #[msg("Protocol is currently paused")]
    ProtocolPaused,
    #[msg("Epoch is not in the expected status")]
    InvalidEpochStatus,
    #[msg("Epoch has not matured yet")]
    EpochNotMatured,
    #[msg("Epoch deposit window has closed")]
    DepositWindowClosed,
    #[msg("Deposit exceeds tranche cap")]
    TrancheCapExceeded,
    #[msg("Deposit amount must be greater than zero")]
    ZeroDeposit,
    #[msg("Position already withdrawn")]
    AlreadyWithdrawn,
    #[msg("Insufficient yield to cover senior tranche")]
    InsufficientYield,
    #[msg("Unauthorized: not the protocol authority")]
    Unauthorized,
    #[msg("Invalid fee configuration")]
    InvalidFeeConfig,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Senior tranche must have deposits before starting epoch")]
    NoSeniorDeposits,
    #[msg("Junior tranche must have deposits before starting epoch")]
    NoJuniorDeposits,
    #[msg("Encrypt accounts are missing or invalid")]
    InvalidEncryptAccounts,
    #[msg("Position has no encrypted balance")]
    MissingEncryptedBalance,
    #[msg("Encrypted withdrawal is still pending decryption")]
    DecryptionPending,
    #[msg("Decryption result is not complete yet")]
    DecryptionNotComplete,
}
