```rust
use anchor_lang::prelude::*;
use crate::state::{User, Chat, ChatParticipant};
use crate::error::SolSocialError;

#[derive(Accounts)]
#[instruction(chat_id: String)]
pub struct CreateChat<'info> {
    #[account(
        init,
        payer = creator,
        space = Chat::LEN,
        seeds = [b"chat", chat_id.as_bytes()],
        bump
    )]
    pub chat: Account<'info, Chat>,

    #[account(
        mut,
        seeds = [b"user", creator.key().as_ref()],
        bump = creator_user.bump,
        constraint = creator_user.is_initialized @ SolSocialError::UserNotInitialized
    )]
    pub creator_user: Account<'info, User>,

    #[account(
        init,
        payer = creator,
        space = ChatParticipant::LEN,
        seeds = [b"chat_participant", chat.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub creator_participant: Account<'info, ChatParticipant>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_chat(
    ctx: Context<CreateChat>,
    chat_id: String,
    name: String,
    description: String,
    is_private: bool,
    max_participants: u32,
) -> Result<()> {
    require!(chat_id.len() <= 32, SolSocialError::ChatIdTooLong);
    require!(name.len() <= 64, SolSocialError::ChatNameTooLong);
    require!(description.len() <= 256, SolSocialError::ChatDescriptionTooLong);
    require!(max_participants > 0 && max_participants <= 1000, SolSocialError::InvalidMaxParticipants);

    let chat = &mut ctx.accounts.chat;
    let creator = &ctx.accounts.creator;
    let creator_user = &ctx.accounts.creator_user;
    let creator_participant = &mut ctx.accounts.creator_participant;

    let clock = Clock::get()?;

    // Initialize chat room
    chat.chat_id = chat_id;
    chat.name = name;
    chat.description = description;
    chat.creator = creator.key();
    chat.is_private = is_private;
    chat.max_participants = max_participants;
    chat.participant_count = 1;
    chat.message_count = 0;
    chat.created_at = clock.unix_timestamp;
    chat.updated_at = clock.unix_timestamp;
    chat.is_active = true;
    chat.bump = ctx.bumps.chat;

    // Initialize creator as first participant
    creator_participant.chat = chat.key();
    creator_participant.user = creator.key();
    creator_participant.username = creator_user.username.clone();
    creator_participant.joined_at = clock.unix_timestamp;
    creator_participant.is_admin = true;
    creator_participant.is_muted = false;
    creator_participant.message_count = 0;
    creator_participant.last_read_at = clock.unix_timestamp;
    creator_participant.bump = ctx.bumps.creator_participant;

    // Update creator's chat count
    creator_user.chat_count = creator_user.chat_count.checked_add(1)
        .ok_or(SolSocialError::ArithmeticOverflow)?;

    emit!(ChatCreatedEvent {
        chat: chat.key(),
        chat_id: chat.chat_id.clone(),
        creator: creator.key(),
        name: chat.name.clone(),
        is_private: chat.is_private,
        max_participants: chat.max_participants,
        created_at: chat.created_at,
    });

    Ok(())
}

#[event]
pub struct ChatCreatedEvent {
    pub chat: Pubkey,
    pub chat_id: String,
    pub creator: Pubkey,
    pub name: String,
    pub is_private: bool,
    pub max_participants: u32,
    pub created_at: i64,
}
```