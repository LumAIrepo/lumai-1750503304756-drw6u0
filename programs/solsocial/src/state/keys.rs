```rust
use anchor_lang::prelude::*;

#[account]
pub struct UserKeys {
    /// The user who owns these keys
    pub user: Pubkey,
    /// Total supply of keys for this user
    pub supply: u64,
    /// Current price per key (in lamports)
    pub price: u64,
    /// Total volume traded (in lamports)
    pub volume: u64,
    /// Number of holders
    pub holders: u64,
    /// Creator earnings (in lamports)
    pub creator_earnings: u64,
    /// Protocol fees collected (in lamports)
    pub protocol_fees: u64,
    /// Timestamp when keys were created
    pub created_at: i64,
    /// Last trade timestamp
    pub last_trade_at: i64,
    /// Bonding curve parameters
    pub curve_params: BondingCurveParams,
    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct BondingCurveParams {
    /// Base price in lamports
    pub base_price: u64,
    /// Price increase factor (scaled by 1e6)
    pub price_factor: u64,
    /// Maximum supply limit
    pub max_supply: u64,
    /// Creator fee percentage (scaled by 1e4, e.g., 500 = 5%)
    pub creator_fee: u16,
    /// Protocol fee percentage (scaled by 1e4, e.g., 250 = 2.5%)
    pub protocol_fee: u16,
}

impl Default for BondingCurveParams {
    fn default() -> Self {
        Self {
            base_price: 1_000_000, // 0.001 SOL
            price_factor: 1_100_000, // 1.1x multiplier
            max_supply: 1_000_000, // 1M keys max
            creator_fee: 500, // 5%
            protocol_fee: 250, // 2.5%
        }
    }
}

#[account]
pub struct KeyHolder {
    /// The holder's wallet address
    pub holder: Pubkey,
    /// The user whose keys are held
    pub keys_user: Pubkey,
    /// Number of keys held
    pub amount: u64,
    /// Average purchase price (in lamports)
    pub avg_price: u64,
    /// Total amount invested (in lamports)
    pub total_invested: u64,
    /// Timestamp when first purchased
    pub first_purchase_at: i64,
    /// Last purchase timestamp
    pub last_purchase_at: i64,
    /// Reserved space for future upgrades
    pub reserved: [u8; 32],
}

#[account]
pub struct KeyTransaction {
    /// Transaction type (buy/sell)
    pub transaction_type: TransactionType,
    /// The user whose keys were traded
    pub keys_user: Pubkey,
    /// The trader (buyer/seller)
    pub trader: Pubkey,
    /// Number of keys traded
    pub amount: u64,
    /// Price per key at time of trade
    pub price_per_key: u64,
    /// Total transaction value
    pub total_value: u64,
    /// Creator fee paid
    pub creator_fee: u64,
    /// Protocol fee paid
    pub protocol_fee: u64,
    /// Transaction timestamp
    pub timestamp: i64,
    /// Transaction signature for reference
    pub signature: String,
    /// Reserved space for future upgrades
    pub reserved: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum TransactionType {
    Buy,
    Sell,
}

impl UserKeys {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        8 + // supply
        8 + // price
        8 + // volume
        8 + // holders
        8 + // creator_earnings
        8 + // protocol_fees
        8 + // created_at
        8 + // last_trade_at
        32 + // curve_params (8 * 4)
        64; // reserved

    pub fn new(user: Pubkey, curve_params: Option<BondingCurveParams>) -> Self {
        let clock = Clock::get().unwrap();
        Self {
            user,
            supply: 0,
            price: curve_params.as_ref().map_or(1_000_000, |p| p.base_price),
            volume: 0,
            holders: 0,
            creator_earnings: 0,
            protocol_fees: 0,
            created_at: clock.unix_timestamp,
            last_trade_at: clock.unix_timestamp,
            curve_params: curve_params.unwrap_or_default(),
            reserved: [0; 64],
        }
    }

    pub fn calculate_price(&self, supply: u64) -> u64 {
        if supply == 0 {
            return self.curve_params.base_price;
        }

        // Exponential bonding curve: price = base_price * (price_factor / 1e6) ^ supply
        let base = self.curve_params.base_price as u128;
        let factor = self.curve_params.price_factor as u128;
        let supply_u128 = supply as u128;

        // Use integer approximation to avoid floating point
        let mut price = base;
        for _ in 0..supply_u128 {
            price = (price * factor) / 1_000_000;
        }

        // Cap at reasonable maximum to prevent overflow
        std::cmp::min(price as u64, 1_000_000_000_000) // 1000 SOL max
    }

    pub fn calculate_buy_price(&self, amount: u64) -> (u64, u64, u64) {
        let mut total_cost = 0u64;
        let current_supply = self.supply;

        for i in 0..amount {
            let price = self.calculate_price(current_supply + i);
            total_cost = total_cost.saturating_add(price);
        }

        let creator_fee = (total_cost as u128 * self.curve_params.creator_fee as u128 / 10_000) as u64;
        let protocol_fee = (total_cost as u128 * self.curve_params.protocol_fee as u128 / 10_000) as u64;

        (total_cost, creator_fee, protocol_fee)
    }

    pub fn calculate_sell_price(&self, amount: u64) -> (u64, u64, u64) {
        if amount > self.supply {
            return (0, 0, 0);
        }

        let mut total_value = 0u64;
        let current_supply = self.supply;

        for i in 0..amount {
            let price = self.calculate_price(current_supply - i - 1);
            total_value = total_value.saturating_add(price);
        }

        let creator_fee = (total_value as u128 * self.curve_params.creator_fee as u128 / 10_000) as u64;
        let protocol_fee = (total_value as u128 * self.curve_params.protocol_fee as u128 / 10_000) as u64;

        (total_value, creator_fee, protocol_fee)
    }

    pub fn update_after_buy(&mut self, amount: u64, total_cost: u64, creator_fee: u64, protocol_fee: u64) {
        self.supply = self.supply.saturating_add(amount);
        self.price = self.calculate_price(self.supply);
        self.volume = self.volume.saturating_add(total_cost);
        self.creator_earnings = self.creator_earnings.saturating_add(creator_fee);
        self.protocol_fees = self.protocol_fees.saturating_add(protocol_fee);
        self.last_trade_at = Clock::get().unwrap().unix_timestamp;
    }

    pub fn update_after_sell(&mut self, amount: u64, total_value: u64, creator_fee: u64, protocol_fee: u64) {
        self.supply = self.supply.saturating_sub(amount);
        self.price = self.calculate_price(self.supply);
        self.volume = self.volume.saturating_add(total_value);
        self.creator_earnings = self.creator_earnings.saturating_add(creator_fee);
        self.protocol_fees = self.protocol_fees.saturating_add(protocol_fee);
        self.last_trade_at = Clock::get().unwrap().unix_timestamp;
    }
}

impl KeyHolder {
    pub const LEN: usize = 8 + // discriminator
        32 + // holder
        32 + // keys_user
        8 + // amount
        8 + // avg_price
        8 + // total_invested
        8 + // first_purchase_at
        8 + // last_purchase_at
        32; // reserved

    pub fn new(holder: Pubkey, keys_user: Pubkey) -> Self {
        let clock = Clock::get().unwrap();
        Self {
            holder,
            keys_user,
            amount: 0,
            avg_price: 0,
            total_invested: 0,
            first_purchase_at: clock.unix_timestamp,
            last_purchase_at: clock.unix_timestamp,
            reserved: [0; 32],
        }
    }

    pub fn update_after_buy(&mut self, amount: u64, price_per_key: u64, total_cost: u64) {
        if self.amount == 0 {
            self.avg_price = price_per_key;
            self.first_purchase_at = Clock::get().unwrap().unix_timestamp;
        } else {
            // Update average price
            let total_value = self.total_invested.saturating_add(total_cost);
            let total_amount = self.amount.saturating_add(amount);
            self.avg_price = if total_amount > 0 { total_value / total_amount } else { 0 };
        }

        self.amount = self.amount.saturating_add(amount);
        self.total_invested = self.total_invested.saturating_add(total_cost);
        self.last_purchase_at = Clock::get().unwrap().unix_timestamp;
    }

    pub fn update_after_sell(&mut self, amount: u64, total_value: u64) {
        self.amount = self.amount.saturating_sub(amount);
        
        // Proportionally reduce total invested
        if self.amount > 0 {
            let remaining_ratio = (self.amount as u128 * 1_000_000) / (self.amount + amount) as u128;
            self.total_invested = ((self.total_invested as u128 * remaining_ratio) / 1_000_000) as u64;
        } else {
            self.total_invested = 0;
            self.avg_price = 0;
        }
    }
}

impl KeyTransaction {
    pub const LEN: usize = 8 + // discriminator
        1 + // transaction_type
        32 + // keys_user
        32 + // trader
        8 + // amount
        8 + // price_per_key
        8 + // total_value
        8 + // creator_fee
        8 + // protocol_fee
        8 + // timestamp
        64 + // signature (max string length)
        32; // reserved

    pub fn new(
        transaction_type: TransactionType,
        keys_user: Pubkey,
        trader: Pubkey,
        amount: u64,
        price_per_key: u64,
        total_value: u64,
        creator_fee: u64,
        protocol_fee: u64,
        signature: String,
    ) -> Self {
        Self {
            transaction_type,
            keys_user,
            trader,
            amount,
            price_per_key,
            total_value,
            creator_fee,
            protocol_fee,
            timestamp: Clock::get().unwrap().unix_timestamp,
            signature,
            reserved: [0; 32],
        }
    }
}

// Seeds for PDA derivation
pub const USER_KEYS_SEED: &[u8] = b"user_keys";
pub const KEY_HOLDER_SEED: &[u8] = b"key_holder";
pub const KEY_TRANSACTION_SEED: &[u8] = b"key_transaction";

// Helper functions for PDA derivation
pub fn get_user_keys_pda(user: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[USER_KEYS_SEED, user.as_ref()],
        program_id,
    )
}

pub fn get_key_holder_pda(holder: &Pubkey, keys_user: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[KEY_HOLDER_SEED, holder.as_ref(), keys_user.as_ref()],
        program_id,
    )
}

pub fn get_key_transaction_pda(
    keys_user: &Pubkey,
    trader: &Pubkey,
    timestamp: i64,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            KEY_TRANSACTION_SEED,
            keys_user.as_ref(),
            trader.as_ref(),
            &timestamp.to_le_bytes(),
        ],
        program_id,
    )
}
```