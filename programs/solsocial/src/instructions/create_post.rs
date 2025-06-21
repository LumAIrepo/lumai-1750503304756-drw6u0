```rust
use anchor_lang::prelude::*;
use crate::state::{User, Post, Keys};
use crate::error::SolSocialError;

#[derive(Accounts)]
#[instruction(content: String)]
pub struct CreatePost<'info> {
    #[account(
        mut,
        seeds = [b"user", author.key().as_ref()],
        bump = user.bump,
        has_one = authority @ SolSocialError::Unauthorized
    )]
    pub user: Account<'info, User>,

    #[account(
        init,
        payer = authority,
        space = Post::LEN + content.len() + 8,
        seeds = [b"post", author.key().as_ref(), &user.post_count.to_le_bytes()],
        bump
    )]
    pub post: Account<'info, Post>,

    #[account(
        seeds = [b"keys", author.key().as_ref()],
        bump = keys.bump
    )]
    pub keys: Account<'info, Keys>,

    /// CHECK: This is the user whose profile is being posted to
    pub author: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_post(
    ctx: Context<CreatePost>,
    content: String,
    media_url: Option<String>,
    post_type: u8, // 0: text, 1: image, 2: video
) -> Result<()> {
    require!(content.len() <= 280, SolSocialError::ContentTooLong);
    require!(content.len() > 0, SolSocialError::ContentEmpty);
    
    if let Some(ref url) = media_url {
        require!(url.len() <= 200, SolSocialError::MediaUrlTooLong);
    }

    require!(post_type <= 2, SolSocialError::InvalidPostType);

    let post = &mut ctx.accounts.post;
    let user = &mut ctx.accounts.user;
    let keys = &ctx.accounts.keys;
    let clock = Clock::get()?;

    // Initialize post
    post.author = ctx.accounts.author.key();
    post.content = content;
    post.media_url = media_url;
    post.post_type = post_type;
    post.timestamp = clock.unix_timestamp;
    post.likes = 0;
    post.comments = 0;
    post.shares = 0;
    post.tips_received = 0;
    post.is_premium = false;
    post.bump = ctx.bumps.post;

    // Check if this should be a premium post (requires holding keys)
    if keys.total_supply > 0 {
        post.is_premium = true;
    }

    // Update user stats
    user.post_count = user.post_count.checked_add(1).ok_or(SolSocialError::Overflow)?;
    user.last_activity = clock.unix_timestamp;

    // Emit event
    emit!(PostCreated {
        post: post.key(),
        author: post.author,
        content: post.content.clone(),
        timestamp: post.timestamp,
        is_premium: post.is_premium,
    });

    Ok(())
}

#[event]
pub struct PostCreated {
    pub post: Pubkey,
    pub author: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub is_premium: bool,
}
```