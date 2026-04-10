use anchor_lang::prelude::*;

/// Mock Kamino adapter for devnet testing.
/// Simulates a Kamino vault by tracking deposits and computing yield
/// at a configurable APY. In production, replace with real Kamino CPI calls.
///
/// Real Kamino integration would:
/// 1. CPI to kamino::deposit(amount) when epoch starts
/// 2. CPI to kamino::withdraw(shares) when harvesting
/// 3. Read vault state for real-time APY

#[account]
#[derive(InitSpace)]
pub struct MockVault {
    /// Authority that can configure the mock
    pub authority: Pubkey,
    /// Total USDC deposited into mock vault
    pub total_deposits: u64,
    /// Simulated APY in basis points (e.g., 1000 = 10%)
    pub simulated_apy_bps: u16,
    /// Last harvest timestamp
    pub last_harvest_at: i64,
    /// Bump
    pub bump: u8,
}

impl MockVault {
    pub const SEED: &'static [u8] = b"mock_vault";

    /// Calculate simulated yield since last harvest
    pub fn calculate_pending_yield(&self, current_time: i64) -> u64 {
        if self.total_deposits == 0 || self.last_harvest_at == 0 {
            return 0;
        }

        let elapsed = (current_time - self.last_harvest_at) as u128;
        let year_seconds: u128 = 365 * 24 * 60 * 60;

        let yield_amount = (self.total_deposits as u128)
            .checked_mul(self.simulated_apy_bps as u128)
            .unwrap()
            .checked_mul(elapsed)
            .unwrap()
            .checked_div(10000_u128.checked_mul(year_seconds).unwrap())
            .unwrap();

        yield_amount as u64
    }
}
