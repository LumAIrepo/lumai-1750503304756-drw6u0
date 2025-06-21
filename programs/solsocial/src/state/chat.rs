```rust
use anchor_lang::prelude::*;

#[account]
pub struct ChatRoom {
    pub room_id: [u8; 32],
    pub creator: Pubkey,
    pub participant: Pubkey,
    pub created_at: i64,
    pub last_message_at: i64,
    pub message_count: u64,
    pub is_active: bool,
    pub creator_keys_required: u64,
    pub participant_keys_required: u64,
    pub bump: u8,
}

impl ChatRoom {
    pub const LEN: usize = 8 + // discriminator
        32 + // room_id
        32 + // creator
        32 + // participant
        8 + // created_at
        8 + // last_message_at
        8 + // message_count
        1 + // is_active
        8 + // creator_keys_required
        8 + // participant_keys_required
        1; // bump

    pub fn initialize(
        &mut self,
        room_id: [u8; 32],
        creator: Pubkey,
        participant: Pubkey,
        creator_keys_required: u64,
        participant_keys_required: u64,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        self.room_id = room_id;
        self.creator = creator;
        self.participant = participant;
        self.created_at = clock.unix_timestamp;
        self.last_message_at = clock.unix_timestamp;
        self.message_count = 0;
        self.is_active = true;
        self.creator_keys_required = creator_keys_required;
        self.participant_keys_required = participant_keys_required;
        self.bump = bump;

        Ok(())
    }

    pub fn update_last_message(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        self.last_message_at = clock.unix_timestamp;
        self.message_count = self.message_count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn deactivate(&mut self) -> Result<()> {
        self.is_active = false;
        Ok(())
    }

    pub fn can_access(&self, user: &Pubkey, user_keys_held: u64, target_keys_held: u64) -> bool {
        if !self.is_active {
            return false;
        }

        if *user == self.creator {
            return target_keys_held >= self.participant_keys_required;
        }

        if *user == self.participant {
            return user_keys_held >= self.creator_keys_required;
        }

        false
    }
}

#[account]
pub struct ChatMessage {
    pub message_id: [u8; 32],
    pub room_id: [u8; 32],
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub content: String,
    pub timestamp: i64,
    pub message_type: MessageType,
    pub is_encrypted: bool,
    pub reply_to: Option<[u8; 32]>,
    pub edited_at: Option<i64>,
    pub is_deleted: bool,
    pub bump: u8,
}

impl ChatMessage {
    pub const MAX_CONTENT_LENGTH: usize = 500;
    
    pub const LEN: usize = 8 + // discriminator
        32 + // message_id
        32 + // room_id
        32 + // sender
        32 + // recipient
        4 + Self::MAX_CONTENT_LENGTH + // content (String)
        8 + // timestamp
        1 + // message_type
        1 + // is_encrypted
        1 + 32 + // reply_to (Option<[u8; 32]>)
        1 + 8 + // edited_at (Option<i64>)
        1 + // is_deleted
        1; // bump

    pub fn initialize(
        &mut self,
        message_id: [u8; 32],
        room_id: [u8; 32],
        sender: Pubkey,
        recipient: Pubkey,
        content: String,
        message_type: MessageType,
        is_encrypted: bool,
        reply_to: Option<[u8; 32]>,
        bump: u8,
    ) -> Result<()> {
        require!(content.len() <= Self::MAX_CONTENT_LENGTH, crate::error::SolSocialError::MessageTooLong);
        
        let clock = Clock::get()?;
        
        self.message_id = message_id;
        self.room_id = room_id;
        self.sender = sender;
        self.recipient = recipient;
        self.content = content;
        self.timestamp = clock.unix_timestamp;
        self.message_type = message_type;
        self.is_encrypted = is_encrypted;
        self.reply_to = reply_to;
        self.edited_at = None;
        self.is_deleted = false;
        self.bump = bump;

        Ok(())
    }

    pub fn edit_content(&mut self, new_content: String) -> Result<()> {
        require!(!self.is_deleted, crate::error::SolSocialError::MessageDeleted);
        require!(new_content.len() <= Self::MAX_CONTENT_LENGTH, crate::error::SolSocialError::MessageTooLong);
        
        let clock = Clock::get()?;
        self.content = new_content;
        self.edited_at = Some(clock.unix_timestamp);

        Ok(())
    }

    pub fn delete(&mut self) -> Result<()> {
        self.is_deleted = true;
        self.content = String::from("[deleted]");
        Ok(())
    }

    pub fn is_sender(&self, user: &Pubkey) -> bool {
        self.sender == *user
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MessageType {
    Text,
    Image,
    File,
    System,
    KeyPurchase,
    KeySale,
}

impl Default for MessageType {
    fn default() -> Self {
        MessageType::Text
    }
}

#[account]
pub struct ChatParticipant {
    pub room_id: [u8; 32],
    pub user: Pubkey,
    pub joined_at: i64,
    pub last_read_at: i64,
    pub is_muted: bool,
    pub is_blocked: bool,
    pub message_count: u64,
    pub bump: u8,
}

impl ChatParticipant {
    pub const LEN: usize = 8 + // discriminator
        32 + // room_id
        32 + // user
        8 + // joined_at
        8 + // last_read_at
        1 + // is_muted
        1 + // is_blocked
        8 + // message_count
        1; // bump

    pub fn initialize(
        &mut self,
        room_id: [u8; 32],
        user: Pubkey,
        bump: u8,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        self.room_id = room_id;
        self.user = user;
        self.joined_at = clock.unix_timestamp;
        self.last_read_at = clock.unix_timestamp;
        self.is_muted = false;
        self.is_blocked = false;
        self.message_count = 0;
        self.bump = bump;

        Ok(())
    }

    pub fn update_last_read(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        self.last_read_at = clock.unix_timestamp;
        Ok(())
    }

    pub fn increment_message_count(&mut self) -> Result<()> {
        self.message_count = self.message_count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn toggle_mute(&mut self) -> Result<()> {
        self.is_muted = !self.is_muted;
        Ok(())
    }

    pub fn toggle_block(&mut self) -> Result<()> {
        self.is_blocked = !self.is_blocked;
        Ok(())
    }
}

#[account]
pub struct ChatSettings {
    pub user: Pubkey,
    pub allow_messages_from_strangers: bool,
    pub require_keys_for_dm: bool,
    pub min_keys_required: u64,
    pub auto_accept_from_holders: bool,
    pub notification_enabled: bool,
    pub encryption_enabled: bool,
    pub bump: u8,
}

impl ChatSettings {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        1 + // allow_messages_from_strangers
        1 + // require_keys_for_dm
        8 + // min_keys_required
        1 + // auto_accept_from_holders
        1 + // notification_enabled
        1 + // encryption_enabled
        1; // bump

    pub fn initialize(
        &mut self,
        user: Pubkey,
        bump: u8,
    ) -> Result<()> {
        self.user = user;
        self.allow_messages_from_strangers = false;
        self.require_keys_for_dm = true;
        self.min_keys_required = 1;
        self.auto_accept_from_holders = true;
        self.notification_enabled = true;
        self.encryption_enabled = false;
        self.bump = bump;

        Ok(())
    }

    pub fn update_settings(
        &mut self,
        allow_messages_from_strangers: Option<bool>,
        require_keys_for_dm: Option<bool>,
        min_keys_required: Option<u64>,
        auto_accept_from_holders: Option<bool>,
        notification_enabled: Option<bool>,
        encryption_enabled: Option<bool>,
    ) -> Result<()> {
        if let Some(allow) = allow_messages_from_strangers {
            self.allow_messages_from_strangers = allow;
        }
        if let Some(require) = require_keys_for_dm {
            self.require_keys_for_dm = require;
        }
        if let Some(min_keys) = min_keys_required {
            self.min_keys_required = min_keys;
        }
        if let Some(auto_accept) = auto_accept_from_holders {
            self.auto_accept_from_holders = auto_accept;
        }
        if let Some(notifications) = notification_enabled {
            self.notification_enabled = notifications;
        }
        if let Some(encryption) = encryption_enabled {
            self.encryption_enabled = encryption;
        }

        Ok(())
    }

    pub fn can_receive_message_from(&self, sender_keys_held: u64, is_key_holder: bool) -> bool {
        if !self.require_keys_for_dm {
            return self.allow_messages_from_strangers;
        }

        if is_key_holder && self.auto_accept_from_holders {
            return true;
        }

        sender_keys_held >= self.min_keys_required
    }
}

pub fn generate_room_id(creator: &Pubkey, participant: &Pubkey) -> [u8; 32] {
    use anchor_lang::solana_program::hash::hash;
    
    let mut data = Vec::new();
    data.extend_from_slice(creator.as_ref());
    data.extend_from_slice(participant.as_ref());
    data.extend_from_slice(b"chat_room");
    
    hash(&data).to_bytes()
}

pub fn generate_message_id(room_id: &[u8; 32], sender: &Pubkey, timestamp: i64) -> [u8; 32] {
    use anchor_lang::solana_program::hash::hash;
    
    let mut data = Vec::new();
    data.extend_from_slice(room_id);
    data.extend_from_slice(sender.as_ref());
    data.extend_from_slice(&timestamp.to_le_bytes());
    data.extend_from_slice(b"message");
    
    hash(&data).to_bytes()
}
```