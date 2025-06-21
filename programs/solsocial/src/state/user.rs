```rust
use anchor_lang::prelude::*;

#[account]
pub struct User {
    /// The user's wallet public key
    pub authority: Pubkey,
    
    /// Display name for the user
    pub name: String,
    
    /// User's bio/description
    pub bio: String,
    
    /// Profile image URL or IPFS hash
    pub profile_image: String,
    
    /// Banner image URL or IPFS hash
    pub banner_image: String,
    
    /// Twitter handle (optional)
    pub twitter: String,
    
    /// Discord handle (optional)
    pub discord: String,
    
    /// Website URL (optional)
    pub website: String,
    
    /// Total number of keys created by this user
    pub keys_created: u64,
    
    /// Total number of keys owned by this user
    pub keys_owned: u64,
    
    /// Total number of posts created
    pub post_count: u64,
    
    /// Total number of followers
    pub follower_count: u64,
    
    /// Total number of following
    pub following_count: u64,
    
    /// Total SOL earned from key sales
    pub total_earnings: u64,
    
    /// Total SOL spent on keys
    pub total_spent: u64,
    
    /// User's reputation score
    pub reputation: u64,
    
    /// Whether the user is verified
    pub is_verified: bool,
    
    /// Whether the user account is active
    pub is_active: bool,
    
    /// Timestamp when the account was created
    pub created_at: i64,
    
    /// Timestamp when the account was last updated
    pub updated_at: i64,
    
    /// Reserved space for future upgrades
    pub reserved: [u8; 128],
}

impl User {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + 50 + // name (max 50 chars)
        4 + 200 + // bio (max 200 chars)
        4 + 100 + // profile_image (max 100 chars)
        4 + 100 + // banner_image (max 100 chars)
        4 + 50 + // twitter (max 50 chars)
        4 + 50 + // discord (max 50 chars)
        4 + 100 + // website (max 100 chars)
        8 + // keys_created
        8 + // keys_owned
        8 + // post_count
        8 + // follower_count
        8 + // following_count
        8 + // total_earnings
        8 + // total_spent
        8 + // reputation
        1 + // is_verified
        1 + // is_active
        8 + // created_at
        8 + // updated_at
        128; // reserved
    
    pub fn initialize(
        &mut self,
        authority: Pubkey,
        name: String,
        bio: String,
        profile_image: String,
        banner_image: String,
        twitter: String,
        discord: String,
        website: String,
        clock: &Clock,
    ) -> Result<()> {
        require!(name.len() <= 50, crate::error::SolSocialError::NameTooLong);
        require!(bio.len() <= 200, crate::error::SolSocialError::BioTooLong);
        require!(profile_image.len() <= 100, crate::error::SolSocialError::ImageUrlTooLong);
        require!(banner_image.len() <= 100, crate::error::SolSocialError::ImageUrlTooLong);
        require!(twitter.len() <= 50, crate::error::SolSocialError::TwitterTooLong);
        require!(discord.len() <= 50, crate::error::SolSocialError::DiscordTooLong);
        require!(website.len() <= 100, crate::error::SolSocialError::WebsiteTooLong);
        
        self.authority = authority;
        self.name = name;
        self.bio = bio;
        self.profile_image = profile_image;
        self.banner_image = banner_image;
        self.twitter = twitter;
        self.discord = discord;
        self.website = website;
        self.keys_created = 0;
        self.keys_owned = 0;
        self.post_count = 0;
        self.follower_count = 0;
        self.following_count = 0;
        self.total_earnings = 0;
        self.total_spent = 0;
        self.reputation = 100; // Starting reputation
        self.is_verified = false;
        self.is_active = true;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.reserved = [0; 128];
        
        Ok(())
    }
    
    pub fn update_profile(
        &mut self,
        name: Option<String>,
        bio: Option<String>,
        profile_image: Option<String>,
        banner_image: Option<String>,
        twitter: Option<String>,
        discord: Option<String>,
        website: Option<String>,
        clock: &Clock,
    ) -> Result<()> {
        if let Some(name) = name {
            require!(name.len() <= 50, crate::error::SolSocialError::NameTooLong);
            self.name = name;
        }
        
        if let Some(bio) = bio {
            require!(bio.len() <= 200, crate::error::SolSocialError::BioTooLong);
            self.bio = bio;
        }
        
        if let Some(profile_image) = profile_image {
            require!(profile_image.len() <= 100, crate::error::SolSocialError::ImageUrlTooLong);
            self.profile_image = profile_image;
        }
        
        if let Some(banner_image) = banner_image {
            require!(banner_image.len() <= 100, crate::error::SolSocialError::ImageUrlTooLong);
            self.banner_image = banner_image;
        }
        
        if let Some(twitter) = twitter {
            require!(twitter.len() <= 50, crate::error::SolSocialError::TwitterTooLong);
            self.twitter = twitter;
        }
        
        if let Some(discord) = discord {
            require!(discord.len() <= 50, crate::error::SolSocialError::DiscordTooLong);
            self.discord = discord;
        }
        
        if let Some(website) = website {
            require!(website.len() <= 100, crate::error::SolSocialError::WebsiteTooLong);
            self.website = website;
        }
        
        self.updated_at = clock.unix_timestamp;
        
        Ok(())
    }
    
    pub fn increment_keys_created(&mut self) {
        self.keys_created = self.keys_created.saturating_add(1);
    }
    
    pub fn increment_keys_owned(&mut self) {
        self.keys_owned = self.keys_owned.saturating_add(1);
    }
    
    pub fn decrement_keys_owned(&mut self) {
        self.keys_owned = self.keys_owned.saturating_sub(1);
    }
    
    pub fn increment_post_count(&mut self) {
        self.post_count = self.post_count.saturating_add(1);
    }
    
    pub fn increment_follower_count(&mut self) {
        self.follower_count = self.follower_count.saturating_add(1);
    }
    
    pub fn decrement_follower_count(&mut self) {
        self.follower_count = self.follower_count.saturating_sub(1);
    }
    
    pub fn increment_following_count(&mut self) {
        self.following_count = self.following_count.saturating_add(1);
    }
    
    pub fn decrement_following_count(&mut self) {
        self.following_count = self.following_count.saturating_sub(1);
    }
    
    pub fn add_earnings(&mut self, amount: u64) {
        self.total_earnings = self.total_earnings.saturating_add(amount);
    }
    
    pub fn add_spending(&mut self, amount: u64) {
        self.total_spent = self.total_spent.saturating_add(amount);
    }
    
    pub fn update_reputation(&mut self, delta: i64) {
        if delta >= 0 {
            self.reputation = self.reputation.saturating_add(delta as u64);
        } else {
            self.reputation = self.reputation.saturating_sub((-delta) as u64);
        }
        
        // Ensure reputation doesn't go below 0
        if self.reputation == 0 {
            self.reputation = 1;
        }
    }
    
    pub fn set_verified(&mut self, verified: bool) {
        self.is_verified = verified;
    }
    
    pub fn set_active(&mut self, active: bool) {
        self.is_active = active;
    }
    
    pub fn get_trading_fee_discount(&self) -> u64 {
        // Higher reputation users get trading fee discounts
        // Max 50% discount for users with 1000+ reputation
        if self.reputation >= 1000 {
            50
        } else if self.reputation >= 500 {
            25
        } else if self.reputation >= 250 {
            10
        } else {
            0
        }
    }
    
    pub fn can_create_keys(&self) -> bool {
        self.is_active && self.reputation >= 50
    }
    
    pub fn can_post(&self) -> bool {
        self.is_active && self.reputation >= 10
    }
    
    pub fn can_chat(&self) -> bool {
        self.is_active && self.reputation >= 25
    }
}

#[account]
pub struct UserFollow {
    /// The user who is following
    pub follower: Pubkey,
    
    /// The user being followed
    pub following: Pubkey,
    
    /// Timestamp when the follow relationship was created
    pub created_at: i64,
    
    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

impl UserFollow {
    pub const LEN: usize = 8 + // discriminator
        32 + // follower
        32 + // following
        8 + // created_at
        64; // reserved
    
    pub fn initialize(
        &mut self,
        follower: Pubkey,
        following: Pubkey,
        clock: &Clock,
    ) -> Result<()> {
        require!(follower != following, crate::error::SolSocialError::CannotFollowSelf);
        
        self.follower = follower;
        self.following = following;
        self.created_at = clock.unix_timestamp;
        self.reserved = [0; 64];
        
        Ok(())
    }
}

#[account]
pub struct UserStats {
    /// The user this stats account belongs to
    pub user: Pubkey,
    
    /// Total volume of keys traded (bought + sold)
    pub total_volume: u64,
    
    /// Number of unique users who own this user's keys
    pub unique_holders: u64,
    
    /// Highest price paid for this user's keys
    pub highest_key_price: u64,
    
    /// Total number of interactions on posts (likes, comments, shares)
    pub total_interactions: u64,
    
    /// Average interaction rate per post
    pub avg_interaction_rate: u64,
    
    /// Number of chat rooms created
    pub chat_rooms_created: u64,
    
    /// Total messages sent across all chats
    pub total_messages_sent: u64,
    
    /// Last activity timestamp
    pub last_activity: i64,
    
    /// Reserved space for future upgrades
    pub reserved: [u8; 96],
}

impl UserStats {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        8 + // total_volume
        8 + // unique_holders
        8 + // highest_key_price
        8 + // total_interactions
        8 + // avg_interaction_rate
        8 + // chat_rooms_created
        8 + // total_messages_sent
        8 + // last_activity
        96; // reserved
    
    pub fn initialize(&mut self, user: Pubkey, clock: &Clock) -> Result<()> {
        self.user = user;
        self.total_volume = 0;
        self.unique_holders = 0;
        self.highest_key_price = 0;
        self.total_interactions = 0;
        self.avg_interaction_rate = 0;
        self.chat_rooms_created = 0;
        self.total_messages_sent = 0;
        self.last_activity = clock.unix_timestamp;
        self.reserved = [0; 96];
        
        Ok(())
    }
    
    pub fn update_volume(&mut self, amount: u64) {
        self.total_volume = self.total_volume.saturating_add(amount);
    }
    
    pub fn update_highest_price(&mut self, price: u64) {
        if price > self.highest_key_price {
            self.highest_key_price = price;
        }
    }
    
    pub fn increment_interactions(&mut self, count: u64) {
        self.total_interactions = self.total_interactions.saturating_add(count);
    }
    
    pub fn increment_chat_rooms(&mut self) {
        self.chat_rooms_created = self.chat_rooms_created.saturating_add(1);
    }
    
    pub fn increment_messages(&mut self) {
        self.total_messages_sent = self.total_messages_sent.saturating_add(1);
    }
    
    pub fn update_activity(&mut self, clock: &Clock) {
        self.last_activity = clock.unix_timestamp;
    }
    
    pub fn calculate_avg_interaction_rate(&mut self, post_count: u64) {
        if post_count > 0 {
            self.avg_interaction_rate = self.total_interactions / post_count;
        }
    }
}
```