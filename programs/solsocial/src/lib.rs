```rust
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod utils;
pub mod error;

use instructions::*;
use error::SolSocialError;

declare_id!("SoLSociaL1111111111111111111111111111111111");

#[program]
pub mod solsocial {
    use super::*;

    pub fn initialize_user(
        ctx: Context<InitializeUser>,
        username: String,
        display_name: String,
        bio: String,
        avatar_url: String,
    ) -> Result<()> {
        instructions::initialize_user::handler(ctx, username, display_name, bio, avatar_url)
    }

    pub fn create_keys(
        ctx: Context<CreateKeys>,
        initial_supply: u64,
        initial_price: u64,
    ) -> Result<()> {
        instructions::create_keys::handler(ctx, initial_supply, initial_price)
    }

    pub fn buy_keys(
        ctx: Context<BuyKeys>,
        amount: u64,
        max_price: u64,
    ) -> Result<()> {
        instructions::buy_keys::handler(ctx, amount, max_price)
    }

    pub fn sell_keys(
        ctx: Context<SellKeys>,
        amount: u64,
        min_price: u64,
    ) -> Result<()> {
        instructions::sell_keys::handler(ctx, amount, min_price)
    }

    pub fn create_post(
        ctx: Context<CreatePost>,
        content: String,
        media_urls: Vec<String>,
        post_type: u8,
        required_keys: u64,
    ) -> Result<()> {
        instructions::create_post::handler(ctx, content, media_urls, post_type, required_keys)
    }

    pub fn interact_post(
        ctx: Context<InteractPost>,
        interaction_type: u8,
        content: Option<String>,
    ) -> Result<()> {
        instructions::interact_post::handler(ctx, interaction_type, content)
    }

    pub fn create_chat(
        ctx: Context<CreateChat>,
        participant: Pubkey,
        required_keys: u64,
    ) -> Result<()> {
        instructions::create_chat::handler(ctx, participant, required_keys)
    }

    pub fn send_message(
        ctx: Context<SendMessage>,
        content: String,
        message_type: u8,
        media_url: Option<String>,
    ) -> Result<()> {
        instructions::send_message::handler(ctx, content, message_type, media_url)
    }

    pub fn update_user_profile(
        ctx: Context<UpdateUserProfile>,
        display_name: Option<String>,
        bio: Option<String>,
        avatar_url: Option<String>,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        
        if let Some(name) = display_name {
            require!(name.len() <= 50, SolSocialError::DisplayNameTooLong);
            user_account.display_name = name;
        }
        
        if let Some(bio_text) = bio {
            require!(bio_text.len() <= 280, SolSocialError::BioTooLong);
            user_account.bio = bio_text;
        }
        
        if let Some(avatar) = avatar_url {
            require!(avatar.len() <= 200, SolSocialError::AvatarUrlTooLong);
            user_account.avatar_url = avatar;
        }
        
        user_account.updated_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }

    pub fn follow_user(
        ctx: Context<FollowUser>,
    ) -> Result<()> {
        let follower_account = &mut ctx.accounts.follower_account;
        let following_account = &mut ctx.accounts.following_account;
        
        follower_account.following_count = follower_account.following_count.checked_add(1)
            .ok_or(SolSocialError::ArithmeticOverflow)?;
        
        following_account.followers_count = following_account.followers_count.checked_add(1)
            .ok_or(SolSocialError::ArithmeticOverflow)?;
        
        emit!(FollowEvent {
            follower: ctx.accounts.follower.key(),
            following: ctx.accounts.following.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn unfollow_user(
        ctx: Context<UnfollowUser>,
    ) -> Result<()> {
        let follower_account = &mut ctx.accounts.follower_account;
        let following_account = &mut ctx.accounts.following_account;
        
        follower_account.following_count = follower_account.following_count.saturating_sub(1);
        following_account.followers_count = following_account.followers_count.saturating_sub(1);
        
        emit!(UnfollowEvent {
            follower: ctx.accounts.follower.key(),
            following: ctx.accounts.following.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn tip_user(
        ctx: Context<TipUser>,
        amount: u64,
        message: Option<String>,
    ) -> Result<()> {
        require!(amount > 0, SolSocialError::InvalidAmount);
        
        if let Some(msg) = &message {
            require!(msg.len() <= 280, SolSocialError::MessageTooLong);
        }
        
        // Transfer SOL from tipper to recipient
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.tipper.key(),
            &ctx.accounts.recipient.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.tipper.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
            ],
        )?;
        
        // Update recipient's total tips received
        let recipient_account = &mut ctx.accounts.recipient_account;
        recipient_account.total_tips_received = recipient_account.total_tips_received
            .checked_add(amount)
            .ok_or(SolSocialError::ArithmeticOverflow)?;
        
        emit!(TipEvent {
            tipper: ctx.accounts.tipper.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
            message: message.unwrap_or_default(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn delete_post(
        ctx: Context<DeletePost>,
    ) -> Result<()> {
        let post_account = &mut ctx.accounts.post_account;
        
        require!(
            post_account.author == ctx.accounts.author.key(),
            SolSocialError::Unauthorized
        );
        
        post_account.is_deleted = true;
        post_account.updated_at = Clock::get()?.unix_timestamp;
        
        emit!(PostDeletedEvent {
            post_id: ctx.accounts.post_account.key(),
            author: ctx.accounts.author.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    pub fn report_content(
        ctx: Context<ReportContent>,
        content_type: u8, // 0 = post, 1 = message, 2 = user
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 500, SolSocialError::ReasonTooLong);
        require!(reason.len() > 0, SolSocialError::EmptyReason);
        
        emit!(ContentReportEvent {
            reporter: ctx.accounts.reporter.key(),
            content_id: ctx.accounts.content.key(),
            content_type,
            reason,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct UpdateUserProfile<'info> {
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump,
        has_one = authority
    )]
    pub user_account: Account<'info, state::User>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FollowUser<'info> {
    #[account(
        mut,
        seeds = [b"user", follower.key().as_ref()],
        bump
    )]
    pub follower_account: Account<'info, state::User>,
    #[account(
        mut,
        seeds = [b"user", following.key().as_ref()],
        bump
    )]
    pub following_account: Account<'info, state::User>,
    pub follower: Signer<'info>,
    /// CHECK: Following user public key
    pub following: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UnfollowUser<'info> {
    #[account(
        mut,
        seeds = [b"user", follower.key().as_ref()],
        bump
    )]
    pub follower_account: Account<'info, state::User>,
    #[account(
        mut,
        seeds = [b"user", following.key().as_ref()],
        bump
    )]
    pub following_account: Account<'info, state::User>,
    pub follower: Signer<'info>,
    /// CHECK: Following user public key
    pub following: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct TipUser<'info> {
    #[account(mut)]
    pub tipper: Signer<'info>,
    #[account(mut)]
    /// CHECK: Recipient public key
    pub recipient: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"user", recipient.key().as_ref()],
        bump
    )]
    pub recipient_account: Account<'info, state::User>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeletePost<'info> {
    #[account(
        mut,
        seeds = [b"post", post_account.id.to_le_bytes().as_ref()],
        bump
    )]
    pub post_account: Account<'info, state::Post>,
    pub author: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReportContent<'info> {
    pub reporter: Signer<'info>,
    /// CHECK: Content being reported
    pub content: AccountInfo<'info>,
}

#[event]
pub struct FollowEvent {
    pub follower: Pubkey,
    pub following: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UnfollowEvent {
    pub follower: Pubkey,
    pub following: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TipEvent {
    pub tipper: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub message: String,
    pub timestamp: i64,
}

#[event]
pub struct PostDeletedEvent {
    pub post_id: Pubkey,
    pub author: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ContentReportEvent {
    pub reporter: Pubkey,
    pub content_id: Pubkey,
    pub content_type: u8,
    pub reason: String,
    pub timestamp: i64,
}
```