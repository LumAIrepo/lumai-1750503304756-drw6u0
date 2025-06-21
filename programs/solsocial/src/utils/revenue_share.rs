```rust
use anchor_lang::prelude::*;
use crate::state::{User, Keys};
use crate::error::SolSocialError;

pub const PROTOCOL_FEE_BPS: u16 = 500; // 5%
pub const CREATOR_FEE_BPS: u16 = 500; // 5%
pub const REFERRER_FEE_BPS: u16 = 100; // 1%

#[derive(Debug, Clone, Copy)]
pub struct RevenueDistribution {
    pub protocol_fee: u64,
    pub creator_fee: u64,
    pub referrer_fee: u64,
    pub net_amount: u64,
}

pub fn calculate_revenue_distribution(
    total_amount: u64,
    has_referrer: bool,
) -> Result<RevenueDistribution> {
    let protocol_fee = calculate_fee(total_amount, PROTOCOL_FEE_BPS)?;
    let creator_fee = calculate_fee(total_amount, CREATOR_FEE_BPS)?;
    let referrer_fee = if has_referrer {
        calculate_fee(total_amount, REFERRER_FEE_BPS)?
    } else {
        0
    };

    let total_fees = protocol_fee
        .checked_add(creator_fee)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_add(referrer_fee)
        .ok_or(SolSocialError::MathOverflow)?;

    let net_amount = total_amount
        .checked_sub(total_fees)
        .ok_or(SolSocialError::InsufficientFunds)?;

    Ok(RevenueDistribution {
        protocol_fee,
        creator_fee,
        referrer_fee,
        net_amount,
    })
}

pub fn calculate_fee(amount: u64, fee_bps: u16) -> Result<u64> {
    let fee = (amount as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SolSocialError::MathOverflow)?;

    Ok(fee as u64)
}

pub fn distribute_buy_revenue<'info>(
    buyer: &AccountInfo<'info>,
    creator: &AccountInfo<'info>,
    protocol_treasury: &AccountInfo<'info>,
    referrer: Option<&AccountInfo<'info>>,
    amount: u64,
) -> Result<RevenueDistribution> {
    let distribution = calculate_revenue_distribution(amount, referrer.is_some())?;

    // Transfer protocol fee
    if distribution.protocol_fee > 0 {
        transfer_lamports(buyer, protocol_treasury, distribution.protocol_fee)?;
    }

    // Transfer creator fee
    if distribution.creator_fee > 0 {
        transfer_lamports(buyer, creator, distribution.creator_fee)?;
    }

    // Transfer referrer fee if applicable
    if let Some(referrer_account) = referrer {
        if distribution.referrer_fee > 0 {
            transfer_lamports(buyer, referrer_account, distribution.referrer_fee)?;
        }
    }

    Ok(distribution)
}

pub fn distribute_sell_revenue<'info>(
    seller: &AccountInfo<'info>,
    creator: &AccountInfo<'info>,
    protocol_treasury: &AccountInfo<'info>,
    referrer: Option<&AccountInfo<'info>>,
    gross_amount: u64,
) -> Result<RevenueDistribution> {
    let distribution = calculate_revenue_distribution(gross_amount, referrer.is_some())?;

    // Creator receives the net amount (after fees)
    if distribution.net_amount > 0 {
        transfer_lamports(creator, seller, distribution.net_amount)?;
    }

    // Protocol receives fee from creator
    if distribution.protocol_fee > 0 {
        transfer_lamports(creator, protocol_treasury, distribution.protocol_fee)?;
    }

    // Creator pays creator fee (stays with creator, but tracked for analytics)
    // This is effectively a no-op but maintains consistency in fee structure

    // Referrer receives fee from creator if applicable
    if let Some(referrer_account) = referrer {
        if distribution.referrer_fee > 0 {
            transfer_lamports(creator, referrer_account, distribution.referrer_fee)?;
        }
    }

    Ok(distribution)
}

pub fn calculate_creator_earnings(
    keys_account: &Account<Keys>,
    current_supply: u64,
) -> Result<u64> {
    let total_volume = keys_account.total_buy_volume
        .checked_add(keys_account.total_sell_volume)
        .ok_or(SolSocialError::MathOverflow)?;

    let creator_earnings = calculate_fee(total_volume, CREATOR_FEE_BPS)?;
    
    Ok(creator_earnings)
}

pub fn calculate_protocol_earnings(
    keys_account: &Account<Keys>,
) -> Result<u64> {
    let total_volume = keys_account.total_buy_volume
        .checked_add(keys_account.total_sell_volume)
        .ok_or(SolSocialError::MathOverflow)?;

    let protocol_earnings = calculate_fee(total_volume, PROTOCOL_FEE_BPS)?;
    
    Ok(protocol_earnings)
}

pub fn update_volume_metrics(
    keys_account: &mut Account<Keys>,
    amount: u64,
    is_buy: bool,
) -> Result<()> {
    if is_buy {
        keys_account.total_buy_volume = keys_account.total_buy_volume
            .checked_add(amount)
            .ok_or(SolSocialError::MathOverflow)?;
    } else {
        keys_account.total_sell_volume = keys_account.total_sell_volume
            .checked_add(amount)
            .ok_or(SolSocialError::MathOverflow)?;
    }

    keys_account.total_volume = keys_account.total_buy_volume
        .checked_add(keys_account.total_sell_volume)
        .ok_or(SolSocialError::MathOverflow)?;

    Ok(())
}

pub fn calculate_holder_rewards(
    user_keys_held: u64,
    total_supply: u64,
    reward_pool: u64,
) -> Result<u64> {
    if total_supply == 0 || user_keys_held == 0 {
        return Ok(0);
    }

    let user_share = (user_keys_held as u128)
        .checked_mul(reward_pool as u128)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(total_supply as u128)
        .ok_or(SolSocialError::MathOverflow)?;

    Ok(user_share as u64)
}

pub fn distribute_activity_rewards<'info>(
    creator: &AccountInfo<'info>,
    reward_recipients: &[(&AccountInfo<'info>, u64)],
    total_reward_amount: u64,
) -> Result<()> {
    let total_shares: u64 = reward_recipients
        .iter()
        .map(|(_, shares)| *shares)
        .sum();

    if total_shares == 0 {
        return Ok(());
    }

    for (recipient, shares) in reward_recipients {
        let reward_amount = ((*shares as u128)
            .checked_mul(total_reward_amount as u128)
            .ok_or(SolSocialError::MathOverflow)?)
            .checked_div(total_shares as u128)
            .ok_or(SolSocialError::MathOverflow)? as u64;

        if reward_amount > 0 {
            transfer_lamports(creator, recipient, reward_amount)?;
        }
    }

    Ok(())
}

fn transfer_lamports<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }

    let from_balance = from.lamports();
    if from_balance < amount {
        return Err(SolSocialError::InsufficientFunds.into());
    }

    **from.try_borrow_mut_lamports()? = from_balance
        .checked_sub(amount)
        .ok_or(SolSocialError::InsufficientFunds)?;

    **to.try_borrow_mut_lamports()? = to.lamports()
        .checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?;

    Ok(())
}

pub fn calculate_staking_rewards(
    staked_amount: u64,
    staking_duration_days: u64,
    annual_rate_bps: u16,
) -> Result<u64> {
    let daily_rate = (annual_rate_bps as u128)
        .checked_div(365 * 10000)
        .ok_or(SolSocialError::MathOverflow)?;

    let rewards = (staked_amount as u128)
        .checked_mul(daily_rate)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_mul(staking_duration_days as u128)
        .ok_or(SolSocialError::MathOverflow)?;

    Ok(rewards as u64)
}

pub fn validate_fee_parameters(
    protocol_fee_bps: u16,
    creator_fee_bps: u16,
    referrer_fee_bps: u16,
) -> Result<()> {
    let total_fees = protocol_fee_bps
        .checked_add(creator_fee_bps)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_add(referrer_fee_bps)
        .ok_or(SolSocialError::MathOverflow)?;

    if total_fees > 2000 { // Max 20% total fees
        return Err(SolSocialError::InvalidFeeStructure.into());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_revenue_distribution() {
        let amount = 1000000; // 1 SOL in lamports
        let distribution = calculate_revenue_distribution(amount, true).unwrap();
        
        assert_eq!(distribution.protocol_fee, 50000); // 5%
        assert_eq!(distribution.creator_fee, 50000); // 5%
        assert_eq!(distribution.referrer_fee, 10000); // 1%
        assert_eq!(distribution.net_amount, 890000); // 89%
    }

    #[test]
    fn test_calculate_fee() {
        let amount = 1000000;
        let fee = calculate_fee(amount, 500).unwrap(); // 5%
        assert_eq!(fee, 50000);
    }

    #[test]
    fn test_calculate_holder_rewards() {
        let user_keys = 10;
        let total_supply = 100;
        let reward_pool = 1000000;
        
        let reward = calculate_holder_rewards(user_keys, total_supply, reward_pool).unwrap();
        assert_eq!(reward, 100000); // 10% of reward pool
    }

    #[test]
    fn test_validate_fee_parameters() {
        // Valid fees
        assert!(validate_fee_parameters(500, 500, 100).is_ok());
        
        // Invalid fees (too high)
        assert!(validate_fee_parameters(1000, 1000, 500).is_err());
    }
}
```