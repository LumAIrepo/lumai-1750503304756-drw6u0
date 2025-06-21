```rust
use anchor_lang::prelude::*;
use crate::state::{User, UserKeys};
use crate::error::SolSocialError;

#[derive(Accounts)]
#[instruction(username: String)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = authority,
        space = User::LEN,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(
        init,
        payer = authority,
        space = UserKeys::LEN,
        seeds = [b"user_keys", authority.key().as_ref()],
        bump
    )]
    pub user_keys: Account<'info, UserKeys>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeUser>,
    username: String,
    display_name: String,
    bio: String,
    avatar_url: String,
) -> Result<()> {
    require!(username.len() <= 32, SolSocialError::UsernameTooLong);
    require!(username.len() >= 3, SolSocialError::UsernameTooShort);
    require!(display_name.len() <= 64, SolSocialError::DisplayNameTooLong);
    require!(bio.len() <= 280, SolSocialError::BioTooLong);
    require!(avatar_url.len() <= 200, SolSocialError::AvatarUrlTooLong);
    
    // Validate username contains only alphanumeric characters and underscores
    for c in username.chars() {
        require!(
            c.is_alphanumeric() || c == '_',
            SolSocialError::InvalidUsername
        );
    }
    
    let user = &mut ctx.accounts.user;
    let user_keys = &mut ctx.accounts.user_keys;
    let clock = Clock::get()?;
    
    // Initialize user account
    user.authority = ctx.accounts.authority.key();
    user.username = username;
    user.display_name = display_name;
    user.bio = bio;
    user.avatar_url = avatar_url;
    user.followers_count = 0;
    user.following_count = 0;
    user.posts_count = 0;
    user.keys_held = 0;
    user.total_earned = 0;
    user.created_at = clock.unix_timestamp;
    user.updated_at = clock.unix_timestamp;
    user.is_verified = false;
    user.bump = ctx.bumps.user;
    
    // Initialize user keys account
    user_keys.authority = ctx.accounts.authority.key();
    user_keys.supply = 0;
    user_keys.price = 0; // Will be set when first key is created
    user_keys.total_volume = 0;
    user_keys.holders_count = 0;
    user_keys.created_at = clock.unix_timestamp;
    user_keys.bump = ctx.bumps.user_keys;
    
    emit!(UserInitialized {
        authority: ctx.accounts.authority.key(),
        username: user.username.clone(),
        display_name: user.display_name.clone(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

#[event]
pub struct UserInitialized {
    pub authority: Pubkey,
    pub username: String,
    pub display_name: String,
    pub timestamp: i64,
}
```