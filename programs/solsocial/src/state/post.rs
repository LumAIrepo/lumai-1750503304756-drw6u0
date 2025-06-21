```rust
use anchor_lang::prelude::*;

#[account]
pub struct Post {
    pub author: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub likes: u64,
    pub comments: u64,
    pub shares: u64,
    pub is_premium: bool,
    pub required_keys: u64,
    pub revenue_generated: u64,
    pub bump: u8,
}

impl Post {
    pub const MAX_CONTENT_LENGTH: usize = 280;
    pub const SPACE: usize = 8 + // discriminator
        32 + // author
        4 + Self::MAX_CONTENT_LENGTH + // content (string)
        8 + // timestamp
        8 + // likes
        8 + // comments
        8 + // shares
        1 + // is_premium
        8 + // required_keys
        8 + // revenue_generated
        1; // bump

    pub fn initialize(
        &mut self,
        author: Pubkey,
        content: String,
        is_premium: bool,
        required_keys: u64,
        bump: u8,
    ) -> Result<()> {
        require!(
            content.len() <= Self::MAX_CONTENT_LENGTH,
            crate::error::SolSocialError::ContentTooLong
        );

        self.author = author;
        self.content = content;
        self.timestamp = Clock::get()?.unix_timestamp;
        self.likes = 0;
        self.comments = 0;
        self.shares = 0;
        self.is_premium = is_premium;
        self.required_keys = required_keys;
        self.revenue_generated = 0;
        self.bump = bump;

        Ok(())
    }

    pub fn add_like(&mut self) -> Result<()> {
        self.likes = self.likes.checked_add(1)
            .ok_or(crate::error::SolSocialError::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn add_comment(&mut self) -> Result<()> {
        self.comments = self.comments.checked_add(1)
            .ok_or(crate::error::SolSocialError::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn add_share(&mut self) -> Result<()> {
        self.shares = self.shares.checked_add(1)
            .ok_or(crate::error::SolSocialError::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn add_revenue(&mut self, amount: u64) -> Result<()> {
        self.revenue_generated = self.revenue_generated.checked_add(amount)
            .ok_or(crate::error::SolSocialError::ArithmeticOverflow)?;
        Ok(())
    }
}

#[account]
pub struct PostInteraction {
    pub post: Pubkey,
    pub user: Pubkey,
    pub interaction_type: InteractionType,
    pub timestamp: i64,
    pub content: Option<String>,
    pub bump: u8,
}

impl PostInteraction {
    pub const MAX_COMMENT_LENGTH: usize = 280;
    pub const SPACE: usize = 8 + // discriminator
        32 + // post
        32 + // user
        1 + // interaction_type
        8 + // timestamp
        1 + 4 + Self::MAX_COMMENT_LENGTH + // content (option<string>)
        1; // bump

    pub fn initialize(
        &mut self,
        post: Pubkey,
        user: Pubkey,
        interaction_type: InteractionType,
        content: Option<String>,
        bump: u8,
    ) -> Result<()> {
        if let Some(ref comment) = content {
            require!(
                comment.len() <= Self::MAX_COMMENT_LENGTH,
                crate::error::SolSocialError::ContentTooLong
            );
        }

        self.post = post;
        self.user = user;
        self.interaction_type = interaction_type;
        self.timestamp = Clock::get()?.unix_timestamp;
        self.content = content;
        self.bump = bump;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum InteractionType {
    Like,
    Comment,
    Share,
}

#[account]
pub struct PostStats {
    pub post: Pubkey,
    pub total_interactions: u64,
    pub unique_interactors: u64,
    pub revenue_per_interaction: u64,
    pub last_updated: i64,
    pub bump: u8,
}

impl PostStats {
    pub const SPACE: usize = 8 + // discriminator
        32 + // post
        8 + // total_interactions
        8 + // unique_interactors
        8 + // revenue_per_interaction
        8 + // last_updated
        1; // bump

    pub fn initialize(&mut self, post: Pubkey, bump: u8) -> Result<()> {
        self.post = post;
        self.total_interactions = 0;
        self.unique_interactors = 0;
        self.revenue_per_interaction = 0;
        self.last_updated = Clock::get()?.unix_timestamp;
        self.bump = bump;

        Ok(())
    }

    pub fn update_stats(&mut self, new_interaction: bool, revenue: u64) -> Result<()> {
        self.total_interactions = self.total_interactions.checked_add(1)
            .ok_or(crate::error::SolSocialError::ArithmeticOverflow)?;

        if new_interaction {
            self.unique_interactors = self.unique_interactors.checked_add(1)
                .ok_or(crate::error::SolSocialError::ArithmeticOverflow)?;
        }

        if self.total_interactions > 0 {
            self.revenue_per_interaction = revenue.checked_div(self.total_interactions)
                .ok_or(crate::error::SolSocialError::ArithmeticOverflow)?;
        }

        self.last_updated = Clock::get()?.unix_timestamp;

        Ok(())
    }
}
```