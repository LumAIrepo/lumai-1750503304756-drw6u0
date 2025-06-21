```rust
use anchor_lang::prelude::*;

/// Bonding curve utility functions for calculating key prices
pub struct BondingCurve;

impl BondingCurve {
    /// Base price for the first key (in lamports)
    pub const BASE_PRICE: u64 = 1_000_000; // 0.001 SOL
    
    /// Price multiplier for exponential growth
    pub const PRICE_MULTIPLIER: u64 = 16000;
    
    /// Maximum supply to prevent overflow
    pub const MAX_SUPPLY: u64 = 1_000_000;
    
    /// Protocol fee percentage (5%)
    pub const PROTOCOL_FEE_PERCENT: u64 = 5;
    
    /// Creator fee percentage (5%)
    pub const CREATOR_FEE_PERCENT: u64 = 5;
    
    /// Calculate the price to buy a specific amount of keys
    /// Uses the formula: sum from i=supply to supply+amount of (BASE_PRICE + (i^2 / PRICE_MULTIPLIER))
    pub fn get_buy_price(supply: u64, amount: u64) -> Result<u64> {
        require!(supply < Self::MAX_SUPPLY, crate::error::SolSocialError::SupplyTooHigh);
        require!(amount > 0, crate::error::SolSocialError::InvalidAmount);
        require!(supply.checked_add(amount).is_some(), crate::error::SolSocialError::Overflow);
        require!(supply + amount <= Self::MAX_SUPPLY, crate::error::SolSocialError::SupplyTooHigh);
        
        let mut total_price = 0u64;
        
        for i in supply..(supply + amount) {
            let key_price = Self::get_price_at_supply(i)?;
            total_price = total_price
                .checked_add(key_price)
                .ok_or(crate::error::SolSocialError::Overflow)?;
        }
        
        Ok(total_price)
    }
    
    /// Calculate the price to sell a specific amount of keys
    /// Uses the same formula but in reverse
    pub fn get_sell_price(supply: u64, amount: u64) -> Result<u64> {
        require!(supply > 0, crate::error::SolSocialError::InsufficientSupply);
        require!(amount > 0, crate::error::SolSocialError::InvalidAmount);
        require!(amount <= supply, crate::error::SolSocialError::InsufficientSupply);
        
        let mut total_price = 0u64;
        
        for i in (supply - amount)..supply {
            let key_price = Self::get_price_at_supply(i)?;
            total_price = total_price
                .checked_add(key_price)
                .ok_or(crate::error::SolSocialError::Overflow)?;
        }
        
        Ok(total_price)
    }
    
    /// Calculate the price of a single key at a specific supply level
    /// Formula: BASE_PRICE + (supply^2 / PRICE_MULTIPLIER)
    pub fn get_price_at_supply(supply: u64) -> Result<u64> {
        require!(supply < Self::MAX_SUPPLY, crate::error::SolSocialError::SupplyTooHigh);
        
        let supply_squared = supply
            .checked_mul(supply)
            .ok_or(crate::error::SolSocialError::Overflow)?;
        
        let curve_component = supply_squared
            .checked_div(Self::PRICE_MULTIPLIER)
            .unwrap_or(0);
        
        let price = Self::BASE_PRICE
            .checked_add(curve_component)
            .ok_or(crate::error::SolSocialError::Overflow)?;
        
        Ok(price)
    }
    
    /// Calculate protocol fee from a given price
    pub fn get_protocol_fee(price: u64) -> Result<u64> {
        let fee = price
            .checked_mul(Self::PROTOCOL_FEE_PERCENT)
            .ok_or(crate::error::SolSocialError::Overflow)?
            .checked_div(100)
            .ok_or(crate::error::SolSocialError::Overflow)?;
        
        Ok(fee)
    }
    
    /// Calculate creator fee from a given price
    pub fn get_creator_fee(price: u64) -> Result<u64> {
        let fee = price
            .checked_mul(Self::CREATOR_FEE_PERCENT)
            .ok_or(crate::error::SolSocialError::Overflow)?
            .checked_div(100)
            .ok_or(crate::error::SolSocialError::Overflow)?;
        
        Ok(fee)
    }
    
    /// Calculate the net price after fees for buying
    pub fn get_buy_price_after_fees(supply: u64, amount: u64) -> Result<(u64, u64, u64)> {
        let base_price = Self::get_buy_price(supply, amount)?;
        let protocol_fee = Self::get_protocol_fee(base_price)?;
        let creator_fee = Self::get_creator_fee(base_price)?;
        
        let total_price = base_price
            .checked_add(protocol_fee)
            .ok_or(crate::error::SolSocialError::Overflow)?
            .checked_add(creator_fee)
            .ok_or(crate::error::SolSocialError::Overflow)?;
        
        Ok((total_price, protocol_fee, creator_fee))
    }
    
    /// Calculate the net price after fees for selling
    pub fn get_sell_price_after_fees(supply: u64, amount: u64) -> Result<(u64, u64, u64)> {
        let base_price = Self::get_sell_price(supply, amount)?;
        let protocol_fee = Self::get_protocol_fee(base_price)?;
        let creator_fee = Self::get_creator_fee(base_price)?;
        
        let net_price = base_price
            .checked_sub(protocol_fee)
            .ok_or(crate::error::SolSocialError::InsufficientFunds)?
            .checked_sub(creator_fee)
            .ok_or(crate::error::SolSocialError::InsufficientFunds)?;
        
        Ok((net_price, protocol_fee, creator_fee))
    }
    
    /// Get the current market cap for a user's keys
    pub fn get_market_cap(supply: u64) -> Result<u64> {
        if supply == 0 {
            return Ok(0);
        }
        
        Self::get_buy_price(0, supply)
    }
    
    /// Calculate the price impact of a trade
    pub fn get_price_impact(supply: u64, amount: u64, is_buy: bool) -> Result<u64> {
        if supply == 0 && !is_buy {
            return Ok(0);
        }
        
        let current_price = if supply > 0 {
            Self::get_price_at_supply(supply - 1)?
        } else {
            Self::BASE_PRICE
        };
        
        let new_supply = if is_buy {
            supply.checked_add(amount).ok_or(crate::error::SolSocialError::Overflow)?
        } else {
            supply.checked_sub(amount).ok_or(crate::error::SolSocialError::InsufficientSupply)?
        };
        
        let new_price = if new_supply > 0 {
            Self::get_price_at_supply(new_supply - 1)?
        } else {
            Self::BASE_PRICE
        };
        
        if new_price > current_price {
            let impact = new_price
                .checked_sub(current_price)
                .ok_or(crate::error::SolSocialError::Overflow)?
                .checked_mul(100)
                .ok_or(crate::error::SolSocialError::Overflow)?
                .checked_div(current_price)
                .ok_or(crate::error::SolSocialError::Overflow)?;
            Ok(impact)
        } else {
            let impact = current_price
                .checked_sub(new_price)
                .ok_or(crate::error::SolSocialError::Overflow)?
                .checked_mul(100)
                .ok_or(crate::error::SolSocialError::Overflow)?
                .checked_div(current_price)
                .ok_or(crate::error::SolSocialError::Overflow)?;
            Ok(impact)
        }
    }
    
    /// Validate that a trade is within reasonable bounds
    pub fn validate_trade(supply: u64, amount: u64, is_buy: bool) -> Result<()> {
        require!(amount > 0, crate::error::SolSocialError::InvalidAmount);
        require!(amount <= 100, crate::error::SolSocialError::AmountTooLarge); // Max 100 keys per trade
        
        if is_buy {
            require!(supply < Self::MAX_SUPPLY, crate::error::SolSocialError::SupplyTooHigh);
            require!(
                supply.checked_add(amount).unwrap_or(u64::MAX) <= Self::MAX_SUPPLY,
                crate::error::SolSocialError::SupplyTooHigh
            );
        } else {
            require!(supply >= amount, crate::error::SolSocialError::InsufficientSupply);
        }
        
        // Check price impact doesn't exceed 50%
        let price_impact = Self::get_price_impact(supply, amount, is_buy)?;
        require!(price_impact <= 50, crate::error::SolSocialError::PriceImpactTooHigh);
        
        Ok(())
    }
    
    /// Get trading statistics for a user's keys
    pub fn get_trading_stats(supply: u64) -> Result<TradingStats> {
        let current_price = if supply > 0 {
            Self::get_price_at_supply(supply - 1)?
        } else {
            Self::BASE_PRICE
        };
        
        let market_cap = Self::get_market_cap(supply)?;
        
        let buy_price_1 = Self::get_buy_price(supply, 1)?;
        let sell_price_1 = if supply > 0 {
            Self::get_sell_price(supply, 1)?
        } else {
            0
        };
        
        Ok(TradingStats {
            current_price,
            market_cap,
            supply,
            buy_price_1,
            sell_price_1,
        })
    }
}

#[derive(Debug, Clone)]
pub struct TradingStats {
    pub current_price: u64,
    pub market_cap: u64,
    pub supply: u64,
    pub buy_price_1: u64,
    pub sell_price_1: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_price_at_supply() {
        // First key should be base price
        assert_eq!(BondingCurve::get_price_at_supply(0).unwrap(), BondingCurve::BASE_PRICE);
        
        // Price should increase with supply
        let price_1 = BondingCurve::get_price_at_supply(1).unwrap();
        let price_10 = BondingCurve::get_price_at_supply(10).unwrap();
        assert!(price_10 > price_1);
    }
    
    #[test]
    fn test_buy_sell_symmetry() {
        let supply = 10;
        let amount = 5;
        
        let buy_price = BondingCurve::get_buy_price(supply, amount).unwrap();
        let sell_price = BondingCurve::get_sell_price(supply + amount, amount).unwrap();
        
        // Buy and sell prices should be equal (before fees)
        assert_eq!(buy_price, sell_price);
    }
    
    #[test]
    fn test_fees_calculation() {
        let price = 1_000_000; // 0.001 SOL
        let protocol_fee = BondingCurve::get_protocol_fee(price).unwrap();
        let creator_fee = BondingCurve::get_creator_fee(price).unwrap();
        
        assert_eq!(protocol_fee, 50_000); // 5% of 1M
        assert_eq!(creator_fee, 50_000); // 5% of 1M
    }
    
    #[test]
    fn test_market_cap() {
        let supply = 0;
        let market_cap = BondingCurve::get_market_cap(supply).unwrap();
        assert_eq!(market_cap, 0);
        
        let supply = 10;
        let market_cap = BondingCurve::get_market_cap(supply).unwrap();
        assert!(market_cap > 0);
    }
    
    #[test]
    fn test_trade_validation() {
        // Valid trade
        assert!(BondingCurve::validate_trade(10, 5, true).is_ok());
        
        // Invalid amount (0)
        assert!(BondingCurve::validate_trade(10, 0, true).is_err());
        
        // Invalid amount (too large)
        assert!(BondingCurve::validate_trade(10, 101, true).is_err());
        
        // Insufficient supply for sell
        assert!(BondingCurve::validate_trade(5, 10, false).is_err());
    }
}
```