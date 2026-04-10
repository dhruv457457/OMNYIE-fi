use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum EpochStatus {
    /// Accepting deposits
    Open,
    /// Epoch is active, yield is being generated
    Active,
    /// Epoch ended, users can withdraw
    Matured,
    /// Emergency: epoch halted
    Halted,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum EpochDuration {
    /// 7-day epoch
    SevenDays,
    /// 14-day epoch
    FourteenDays,
    /// 30-day epoch
    ThirtyDays,
}

impl EpochDuration {
    pub fn to_seconds(&self) -> i64 {
        match self {
            EpochDuration::SevenDays => 7 * 24 * 60 * 60,
            EpochDuration::FourteenDays => 14 * 24 * 60 * 60,
            EpochDuration::ThirtyDays => 30 * 24 * 60 * 60,
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct Epoch {
    /// Protocol this epoch belongs to
    pub protocol: Pubkey,
    /// Epoch number (sequential)
    pub epoch_number: u64,
    /// Duration type
    pub duration: EpochDuration,
    /// Current status
    pub status: EpochStatus,
    /// Fixed APY promised to senior tranche (basis points, e.g. 800 = 8%)
    pub senior_fixed_rate_bps: u16,
    /// Total USDC deposited in senior tranche
    pub senior_total: u64,
    /// Total USDC deposited in junior tranche
    pub junior_total: u64,
    /// Senior tranche deposit cap (0 = no cap)
    pub senior_cap: u64,
    /// Junior tranche deposit cap (0 = no cap)
    pub junior_cap: u64,
    /// Total yield harvested from underlying protocol
    pub total_yield_harvested: u64,
    /// Yield distributed to senior tranche
    pub senior_yield_distributed: u64,
    /// Yield distributed to junior tranche
    pub junior_yield_distributed: u64,
    /// Platform fees collected
    pub fees_collected: u64,
    /// Insurance fund contribution from this epoch
    pub insurance_contribution: u64,
    /// Timestamp when epoch was created
    pub created_at: i64,
    /// Timestamp when epoch started (deposits closed, yield starts)
    pub started_at: i64,
    /// Timestamp when epoch matures
    pub matures_at: i64,
    /// Underlying yield source vault address
    pub vault_address: Pubkey,
    /// Bump seed
    pub bump: u8,
}

impl Epoch {
    pub const SEED: &'static [u8] = b"epoch";

    /// Calculate the senior fixed yield for this epoch
    pub fn calculate_senior_yield(&self) -> u64 {
        let duration_seconds = self.duration.to_seconds() as u128;
        let year_seconds: u128 = 365 * 24 * 60 * 60;
        let principal = self.senior_total as u128;
        let rate = self.senior_fixed_rate_bps as u128;

        let yield_amount = principal
            .checked_mul(rate)
            .unwrap()
            .checked_mul(duration_seconds)
            .unwrap()
            .checked_div(10000_u128.checked_mul(year_seconds).unwrap())
            .unwrap();

        yield_amount as u64
    }

    /// Calculate junior yield: total_yield - senior_yield - fees
    pub fn calculate_junior_yield(&self, total_yield: u64, performance_fee_bps: u16, insurance_fee_bps: u16) -> (u64, u64, u64) {
        let senior_yield = self.calculate_senior_yield();

        let senior_actual = if total_yield >= senior_yield {
            senior_yield
        } else {
            total_yield
        };

        let remaining = total_yield.saturating_sub(senior_actual);

        let performance_fee = (remaining as u128)
            .checked_mul(performance_fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        let insurance_fee = (remaining as u128)
            .checked_mul(insurance_fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        let junior_yield = remaining
            .saturating_sub(performance_fee)
            .saturating_sub(insurance_fee);

        let total_fees = performance_fee + insurance_fee;

        (senior_actual, junior_yield, total_fees)
    }
}