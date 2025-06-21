```rust
use anchor_lang::prelude::*;
use crate::state::{User, Post, PostInteraction, InteractionType};
use crate::error::SolSocialError;

#[derive(Accounts)]
#[instruction(post_id: u64)]
pub struct InteractPost<'info> {
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user.bump,
    )]
    pub user: Account<'info, User>,

    #[account(
        mut,
        seeds = [b"post", post.author.as_ref(), &post.id.to_le_bytes()],
        bump = post.bump,
    )]
    pub post: Account<'info, Post>,

    #[account(
        init_if_needed,
        payer = authority,
        space = PostInteraction::LEN,
        seeds = [b"interaction", post.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub interaction: Account<'info, PostInteraction>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn interact_post(
    ctx: Context<InteractPost>,
    interaction_type: InteractionType,
    comment_text: Option<String>,
) -> Result<()> {
    let user = &mut ctx.accounts.user;
    let post = &mut ctx.accounts.post;
    let interaction = &mut ctx.accounts.interaction;

    // Validate comment text length if provided
    if let Some(ref text) = comment_text {
        require!(
            text.len() <= 500,
            SolSocialError::CommentTooLong
        );
        require!(
            !text.trim().is_empty(),
            SolSocialError::EmptyComment
        );
    }

    // Check if this is a new interaction or updating existing
    let is_new_interaction = interaction.user == Pubkey::default();

    if is_new_interaction {
        // Initialize new interaction
        interaction.user = user.key();
        interaction.post = post.key();
        interaction.interaction_type = interaction_type.clone();
        interaction.timestamp = Clock::get()?.unix_timestamp;
        interaction.bump = ctx.bumps.interaction;

        if let Some(text) = comment_text {
            interaction.comment_text = Some(text);
        }

        // Update post counters
        match interaction_type {
            InteractionType::Like => {
                post.likes += 1;
                user.total_likes_given += 1;
            },
            InteractionType::Comment => {
                post.comments += 1;
                user.total_comments += 1;
            },
            InteractionType::Share => {
                post.shares += 1;
                user.total_shares += 1;
            },
        }
    } else {
        // Update existing interaction
        let old_type = interaction.interaction_type.clone();
        
        // If changing interaction type, update counters
        if old_type != interaction_type {
            // Decrement old type counters
            match old_type {
                InteractionType::Like => {
                    post.likes = post.likes.saturating_sub(1);
                    user.total_likes_given = user.total_likes_given.saturating_sub(1);
                },
                InteractionType::Comment => {
                    post.comments = post.comments.saturating_sub(1);
                    user.total_comments = user.total_comments.saturating_sub(1);
                },
                InteractionType::Share => {
                    post.shares = post.shares.saturating_sub(1);
                    user.total_shares = user.total_shares.saturating_sub(1);
                },
            }

            // Increment new type counters
            match interaction_type {
                InteractionType::Like => {
                    post.likes += 1;
                    user.total_likes_given += 1;
                },
                InteractionType::Comment => {
                    post.comments += 1;
                    user.total_comments += 1;
                },
                InteractionType::Share => {
                    post.shares += 1;
                    user.total_shares += 1;
                },
            }

            interaction.interaction_type = interaction_type;
        }

        // Update comment text if provided and it's a comment
        if matches!(interaction_type, InteractionType::Comment) {
            if let Some(text) = comment_text {
                interaction.comment_text = Some(text);
            }
        }

        interaction.timestamp = Clock::get()?.unix_timestamp;
    }

    // Update post engagement score
    post.engagement_score = calculate_engagement_score(post.likes, post.comments, post.shares);

    // Update user activity timestamp
    user.last_activity = Clock::get()?.unix_timestamp;

    // Emit interaction event
    emit!(PostInteractionEvent {
        user: user.key(),
        post: post.key(),
        interaction_type: interaction_type.clone(),
        timestamp: Clock::get()?.unix_timestamp,
        comment_text: comment_text.clone(),
    });

    Ok(())
}

fn calculate_engagement_score(likes: u64, comments: u64, shares: u64) -> u64 {
    // Weighted engagement score: comments and shares are worth more than likes
    likes + (comments * 3) + (shares * 5)
}

#[event]
pub struct PostInteractionEvent {
    pub user: Pubkey,
    pub post: Pubkey,
    pub interaction_type: InteractionType,
    pub timestamp: i64,
    pub comment_text: Option<String>,
}

#[derive(Accounts)]
pub struct RemoveInteraction<'info> {
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user.bump,
    )]
    pub user: Account<'info, User>,

    #[account(
        mut,
        seeds = [b"post", post.author.as_ref(), &post.id.to_le_bytes()],
        bump = post.bump,
    )]
    pub post: Account<'info, Post>,

    #[account(
        mut,
        seeds = [b"interaction", post.key().as_ref(), user.key().as_ref()],
        bump = interaction.bump,
        close = authority,
    )]
    pub interaction: Account<'info, PostInteraction>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn remove_interaction(ctx: Context<RemoveInteraction>) -> Result<()> {
    let user = &mut ctx.accounts.user;
    let post = &mut ctx.accounts.post;
    let interaction = &ctx.accounts.interaction;

    // Verify the user owns this interaction
    require!(
        interaction.user == user.key(),
        SolSocialError::UnauthorizedInteraction
    );

    // Decrement counters based on interaction type
    match interaction.interaction_type {
        InteractionType::Like => {
            post.likes = post.likes.saturating_sub(1);
            user.total_likes_given = user.total_likes_given.saturating_sub(1);
        },
        InteractionType::Comment => {
            post.comments = post.comments.saturating_sub(1);
            user.total_comments = user.total_comments.saturating_sub(1);
        },
        InteractionType::Share => {
            post.shares = post.shares.saturating_sub(1);
            user.total_shares = user.total_shares.saturating_sub(1);
        },
    }

    // Recalculate engagement score
    post.engagement_score = calculate_engagement_score(post.likes, post.comments, post.shares);

    // Update user activity timestamp
    user.last_activity = Clock::get()?.unix_timestamp;

    // Emit removal event
    emit!(InteractionRemovedEvent {
        user: user.key(),
        post: post.key(),
        interaction_type: interaction.interaction_type.clone(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct InteractionRemovedEvent {
    pub user: Pubkey,
    pub post: Pubkey,
    pub interaction_type: InteractionType,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction(post_id: u64, limit: u8)]
pub struct GetPostInteractions<'info> {
    #[account(
        seeds = [b"post", post.author.as_ref(), &post.id.to_le_bytes()],
        bump = post.bump,
    )]
    pub post: Account<'info, Post>,
}

pub fn get_post_interactions(
    _ctx: Context<GetPostInteractions>,
    _post_id: u64,
    _limit: u8,
) -> Result<()> {
    // This instruction is primarily for client-side querying
    // The actual data fetching happens on the client side
    Ok(())
}
```