```rust
pub mod user;
pub mod keys;
pub mod post;
pub mod chat;

pub use user::*;
pub use keys::*;
pub use post::*;
pub use chat::*;

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum InteractionType {
    Like,
    Comment,
    Share,
    Tip,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PostType {
    Text,
    Image,
    Video,
    Poll,
    Repost,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ChatType {
    Direct,
    Group,
    KeyHolders,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum MessageType {
    Text,
    Image,
    File,
    System,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct PricePoint {
    pub supply: u64,
    pub price: u64,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct RevenueShare {
    pub creator_share: u64,
    pub platform_share: u64,
    pub referrer_share: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct TradingStats {
    pub total_volume: u64,
    pub total_trades: u64,
    pub highest_price: u64,
    pub lowest_price: u64,
    pub last_trade_price: u64,
    pub last_trade_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct SocialStats {
    pub total_posts: u64,
    pub total_likes: u64,
    pub total_comments: u64,
    pub total_shares: u64,
    pub total_tips_received: u64,
    pub total_tips_sent: u64,
    pub followers_count: u64,
    pub following_count: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ChatStats {
    pub total_messages: u64,
    pub total_participants: u64,
    pub last_activity: i64,
    pub is_active: bool,
}

pub const MAX_USERNAME_LENGTH: usize = 32;
pub const MAX_DISPLAY_NAME_LENGTH: usize = 64;
pub const MAX_BIO_LENGTH: usize = 280;
pub const MAX_POST_CONTENT_LENGTH: usize = 1000;
pub const MAX_COMMENT_LENGTH: usize = 500;
pub const MAX_MESSAGE_LENGTH: usize = 1000;
pub const MAX_CHAT_NAME_LENGTH: usize = 64;
pub const MAX_CHAT_DESCRIPTION_LENGTH: usize = 200;
pub const MAX_HASHTAGS: usize = 10;
pub const MAX_MENTIONS: usize = 20;
pub const MAX_MEDIA_URLS: usize = 4;
pub const MAX_POLL_OPTIONS: usize = 4;
pub const MAX_CHAT_PARTICIPANTS: usize = 100;

pub const BONDING_CURVE_BASE_PRICE: u64 = 1_000_000; // 0.001 SOL in lamports
pub const BONDING_CURVE_MULTIPLIER: u64 = 16000;
pub const CREATOR_REVENUE_SHARE: u64 = 5000; // 50%
pub const PLATFORM_REVENUE_SHARE: u64 = 2500; // 25%
pub const REFERRER_REVENUE_SHARE: u64 = 2500; // 25%

pub const SEED_USER_PROFILE: &[u8] = b"user_profile";
pub const SEED_USER_KEYS: &[u8] = b"user_keys";
pub const SEED_POST: &[u8] = b"post";
pub const SEED_POST_INTERACTION: &[u8] = b"post_interaction";
pub const SEED_CHAT_ROOM: &[u8] = b"chat_room";
pub const SEED_CHAT_MESSAGE: &[u8] = b"chat_message";
pub const SEED_CHAT_PARTICIPANT: &[u8] = b"chat_participant";
pub const SEED_KEY_HOLDER: &[u8] = b"key_holder";
pub const SEED_FOLLOWER: &[u8] = b"follower";
pub const SEED_FOLLOWING: &[u8] = b"following";

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct MediaAttachment {
    pub url: String,
    pub media_type: String,
    pub size: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct PollOption {
    pub text: String,
    pub votes: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Hashtag {
    pub tag: String,
    pub count: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Mention {
    pub username: String,
    pub user_pubkey: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct NotificationSettings {
    pub likes: bool,
    pub comments: bool,
    pub shares: bool,
    pub tips: bool,
    pub follows: bool,
    pub mentions: bool,
    pub key_trades: bool,
    pub chat_messages: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            likes: true,
            comments: true,
            shares: true,
            tips: true,
            follows: true,
            mentions: true,
            key_trades: true,
            chat_messages: true,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct PrivacySettings {
    pub profile_visibility: ProfileVisibility,
    pub post_visibility: PostVisibility,
    pub chat_permissions: ChatPermissions,
    pub key_trading_enabled: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ProfileVisibility {
    Public,
    KeyHoldersOnly,
    Private,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PostVisibility {
    Public,
    KeyHoldersOnly,
    FollowersOnly,
    Private,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ChatPermissions {
    Anyone,
    KeyHoldersOnly,
    FollowersOnly,
    Disabled,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            profile_visibility: ProfileVisibility::Public,
            post_visibility: PostVisibility::Public,
            chat_permissions: ChatPermissions::KeyHoldersOnly,
            key_trading_enabled: true,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ActivityMetrics {
    pub daily_active_users: u64,
    pub weekly_active_users: u64,
    pub monthly_active_users: u64,
    pub total_posts_today: u64,
    pub total_trades_today: u64,
    pub total_volume_today: u64,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct PlatformStats {
    pub total_users: u64,
    pub total_posts: u64,
    pub total_key_trades: u64,
    pub total_volume: u64,
    pub total_revenue: u64,
    pub active_chat_rooms: u64,
    pub total_messages: u64,
}
```