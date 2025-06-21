```rust
use anchor_lang::prelude::*;
use crate::state::{User, Chat, ChatMessage};
use crate::error::SolSocialError;

#[derive(Accounts)]
#[instruction(chat_id: String, content: String)]
pub struct SendMessage<'info> {
    #[account(
        mut,
        seeds = [b"user", sender.key().as_ref()],
        bump = sender_user.bump,
        has_one = owner @ SolSocialError::Unauthorized
    )]
    pub sender_user: Account<'info, User>,

    #[account(
        mut,
        seeds = [b"chat", chat_id.as_bytes()],
        bump = chat.bump,
        constraint = chat.is_participant(sender.key()) @ SolSocialError::NotChatParticipant
    )]
    pub chat: Account<'info, Chat>,

    #[account(
        init,
        payer = sender,
        space = ChatMessage::LEN,
        seeds = [
            b"message",
            chat.key().as_ref(),
            &chat.message_count.to_le_bytes()
        ],
        bump
    )]
    pub message: Account<'info, ChatMessage>,

    #[account(mut)]
    pub sender: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn send_message(
    ctx: Context<SendMessage>,
    chat_id: String,
    content: String,
) -> Result<()> {
    require!(content.len() <= 500, SolSocialError::MessageTooLong);
    require!(!content.trim().is_empty(), SolSocialError::EmptyMessage);

    let chat = &mut ctx.accounts.chat;
    let message = &mut ctx.accounts.message;
    let sender = &ctx.accounts.sender;

    // Check if chat is active
    require!(chat.is_active, SolSocialError::ChatInactive);

    // Initialize message
    message.chat = chat.key();
    message.sender = sender.key();
    message.content = content;
    message.timestamp = Clock::get()?.unix_timestamp;
    message.message_id = chat.message_count;
    message.is_deleted = false;
    message.bump = ctx.bumps.message;

    // Update chat metadata
    chat.message_count = chat.message_count.checked_add(1)
        .ok_or(SolSocialError::Overflow)?;
    chat.last_message_at = Clock::get()?.unix_timestamp;
    chat.last_message_sender = sender.key();

    // Update sender's message count
    let sender_user = &mut ctx.accounts.sender_user;
    sender_user.messages_sent = sender_user.messages_sent.checked_add(1)
        .ok_or(SolSocialError::Overflow)?;

    emit!(MessageSentEvent {
        chat_id: chat.key(),
        message_id: message.message_id,
        sender: sender.key(),
        content: message.content.clone(),
        timestamp: message.timestamp,
    });

    Ok(())
}

#[event]
pub struct MessageSentEvent {
    pub chat_id: Pubkey,
    pub message_id: u64,
    pub sender: Pubkey,
    pub content: String,
    pub timestamp: i64,
}
```