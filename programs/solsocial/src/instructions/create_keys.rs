```rust
use anchor_lang::prelude::*;
use crate::state::{User, UserKeys};
use crate::utils::bonding_curve::calculate_price;
use crate::error::SolSocialError;

#[derive(Accounts)]
#[instruction(user_bump: u8)]
pub struct CreateKeys<'info> {
    #[account(
        seeds = [b"user", creator.key().as_ref()],
        bump = user_bump,
        has_one = creator
    )]
    pub user_account: Account<'info, User>,

    #[account(
        init,
        payer = creator,
        space = UserKeys::LEN,
        seeds = [b"keys", creator.key().as_ref()],
        bump
    )]
    pub user_keys: Account<'info, UserKeys>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateKeys>, user_bump: u8) -> Result<()> {
    let user_keys = &mut ctx.accounts.user_keys;
    let creator = &ctx.accounts.creator;
    let clock = Clock::get()?;

    // Validate user account exists
    require!(
        ctx.accounts.user_account.is_initialized,
        SolSocialError::UserNotInitialized
    );

    // Initialize user keys account
    user_keys.creator = creator.key();
    user_keys.total_supply = 0;
    user_keys.holders_count = 0;
    user_keys.created_at = clock.unix_timestamp;
    user_keys.is_active = true;
    user_keys.bump = ctx.bumps.user_keys;

    // Calculate initial price for first key (creator gets first key for free)
    let initial_price = calculate_price(0, 1)?;
    
    // Creator automatically gets the first key
    user_keys.total_supply = 1;
    user_keys.holders_count = 1;

    // Initialize creator's holding
    user_keys.holders.push(crate::state::KeyHolder {
        holder: creator.key(),
        amount: 1,
        last_trade_timestamp: clock.unix_timestamp,
    });

    // Update total volume and fees collected (both start at 0)
    user_keys.total_volume = 0;
    user_keys.total_fees_collected = 0;
    user_keys.creator_earnings = 0;

    // Set bonding curve parameters
    user_keys.base_price = 1_000_000; // 0.001 SOL in lamports
    user_keys.price_increment = 100_000; // 0.0001 SOL increment per key

    msg!(
        "Keys created for user: {}, initial supply: {}, initial price: {}",
        creator.key(),
        user_keys.total_supply,
        initial_price
    );

    Ok(())
}
```