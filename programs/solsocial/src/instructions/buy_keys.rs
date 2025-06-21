```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{User, UserKeys};
use crate::utils::bonding_curve::calculate_buy_price;
use crate::utils::revenue_share::distribute_revenue;
use crate::error::SolSocialError;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct BuyKeys<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user", buyer.key().as_ref()],
        bump,
    )]
    pub buyer_account: Account<'info, User>,
    
    /// CHECK: This is the subject whose keys are being bought
    pub subject: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"user", subject.key().as_ref()],
        bump,
    )]
    pub subject_account: Account<'info, User>,
    
    #[account(
        mut,
        seeds = [b"keys", subject.key().as_ref()],
        bump,
    )]
    pub keys_account: Account<'info, UserKeys>,
    
    #[account(
        mut,
        associated_token::mint = keys_account.mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = keys_account.mint,
        associated_token::authority = subject,
    )]
    pub subject_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_keys(ctx: Context<BuyKeys>, amount: u64) -> Result<()> {
    let keys_account = &mut ctx.accounts.keys_account;
    let buyer_account = &mut ctx.accounts.buyer_account;
    let subject_account = &mut ctx.accounts.subject_account;
    
    require!(amount > 0, SolSocialError::InvalidAmount);
    require!(keys_account.is_active, SolSocialError::KeysNotActive);
    
    // Calculate the price for buying the specified amount of keys
    let current_supply = keys_account.supply;
    let price = calculate_buy_price(current_supply, amount)?;
    
    require!(price > 0, SolSocialError::InvalidPrice);
    
    // Check if buyer has enough SOL
    let buyer_balance = ctx.accounts.buyer.lamports();
    require!(buyer_balance >= price, SolSocialError::InsufficientFunds);
    
    // Calculate fees and revenue distribution
    let protocol_fee = price.checked_mul(keys_account.protocol_fee_percent as u64)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let subject_fee = price.checked_mul(keys_account.subject_fee_percent as u64)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(10000)
        .ok_or(SolSocialError::MathOverflow)?;
    
    let net_price = price.checked_sub(protocol_fee)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_sub(subject_fee)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Transfer SOL from buyer to treasury (protocol fee)
    if protocol_fee > 0 {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.treasury.key(),
            protocol_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;
    }
    
    // Transfer SOL from buyer to subject (subject fee)
    if subject_fee > 0 {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.subject.key(),
            subject_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.subject.to_account_info(),
            ],
        )?;
    }
    
    // Update keys supply
    keys_account.supply = keys_account.supply.checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update total volume
    keys_account.total_volume = keys_account.total_volume.checked_add(price)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update buyer's key balance
    let buyer_key_balance = ctx.accounts.buyer_token_account.amount;
    let new_buyer_balance = buyer_key_balance.checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Mint keys to buyer
    let cpi_accounts = token::MintTo {
        mint: keys_account.to_account_info(),
        to: ctx.accounts.buyer_token_account.to_account_info(),
        authority: keys_account.to_account_info(),
    };
    
    let seeds = &[
        b"keys",
        ctx.accounts.subject.key().as_ref(),
        &[ctx.bumps.keys_account],
    ];
    let signer = &[&seeds[..]];
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::mint_to(cpi_ctx, amount)?;
    
    // Update buyer's total keys purchased
    buyer_account.total_keys_purchased = buyer_account.total_keys_purchased
        .checked_add(amount)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update buyer's total spent
    buyer_account.total_spent = buyer_account.total_spent
        .checked_add(price)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update subject's total earnings
    subject_account.total_earnings = subject_account.total_earnings
        .checked_add(subject_fee)
        .ok_or(SolSocialError::MathOverflow)?;
    
    // Update last activity timestamp
    let clock = Clock::get()?;
    keys_account.last_activity = clock.unix_timestamp;
    buyer_account.last_activity = clock.unix_timestamp;
    subject_account.last_activity = clock.unix_timestamp;
    
    // Emit buy event
    emit!(KeysBoughtEvent {
        buyer: ctx.accounts.buyer.key(),
        subject: ctx.accounts.subject.key(),
        amount,
        price,
        protocol_fee,
        subject_fee,
        supply_after: keys_account.supply,
        timestamp: clock.unix_timestamp,
    });
    
    // Check if this is the first key purchase (excluding subject's initial key)
    if keys_account.supply == amount + 1 {
        // First buyer gets special status
        buyer_account.is_early_supporter = true;
        
        emit!(FirstKeyBoughtEvent {
            buyer: ctx.accounts.buyer.key(),
            subject: ctx.accounts.subject.key(),
            amount,
            price,
            timestamp: clock.unix_timestamp,
        });
    }
    
    // Update holder count if this is buyer's first keys of this subject
    if buyer_key_balance == 0 {
        keys_account.holder_count = keys_account.holder_count.checked_add(1)
            .ok_or(SolSocialError::MathOverflow)?;
    }
    
    // Check for milestone achievements
    if keys_account.supply >= 100 && !keys_account.milestone_100_reached {
        keys_account.milestone_100_reached = true;
        subject_account.total_earnings = subject_account.total_earnings
            .checked_add(1_000_000) // 0.001 SOL bonus
            .ok_or(SolSocialError::MathOverflow)?;
        
        emit!(MilestoneReachedEvent {
            subject: ctx.accounts.subject.key(),
            milestone: 100,
            bonus_amount: 1_000_000,
            timestamp: clock.unix_timestamp,
        });
    }
    
    if keys_account.supply >= 1000 && !keys_account.milestone_1000_reached {
        keys_account.milestone_1000_reached = true;
        subject_account.total_earnings = subject_account.total_earnings
            .checked_add(10_000_000) // 0.01 SOL bonus
            .ok_or(SolSocialError::MathOverflow)?;
        
        emit!(MilestoneReachedEvent {
            subject: ctx.accounts.subject.key(),
            milestone: 1000,
            bonus_amount: 10_000_000,
            timestamp: clock.unix_timestamp,
        });
    }
    
    Ok(())
}

#[event]
pub struct KeysBoughtEvent {
    pub buyer: Pubkey,
    pub subject: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub protocol_fee: u64,
    pub subject_fee: u64,
    pub supply_after: u64,
    pub timestamp: i64,
}

#[event]
pub struct FirstKeyBoughtEvent {
    pub buyer: Pubkey,
    pub subject: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneReachedEvent {
    pub subject: Pubkey,
    pub milestone: u64,
    pub bonus_amount: u64,
    pub timestamp: i64,
}
```