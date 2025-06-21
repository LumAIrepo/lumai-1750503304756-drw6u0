```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{User, UserKeys};
use crate::utils::{bonding_curve::calculate_sell_price, revenue_share::calculate_protocol_fee};
use crate::error::SolSocialError;

#[derive(Accounts)]
pub struct SellKeys<'info> {
    #[account(
        mut,
        seeds = [b"user", seller.key().as_ref()],
        bump = seller.bump,
    )]
    pub seller: Account<'info, User>,

    #[account(
        mut,
        seeds = [b"keys", subject.key().as_ref()],
        bump = subject_keys.bump,
    )]
    pub subject_keys: Account<'info, UserKeys>,

    #[account(
        mut,
        seeds = [b"user", subject_keys.subject.as_ref()],
        bump = subject.bump,
    )]
    pub subject: Account<'info, User>,

    #[account(
        mut,
        associated_token::mint = subject_keys.mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = subject_keys.mint,
        associated_token::authority = subject_keys,
    )]
    pub subject_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"protocol_fee"],
        bump,
    )]
    pub protocol_fee_account: SystemAccount<'info>,

    #[account(mut)]
    pub seller_wallet: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn sell_keys(ctx: Context<SellKeys>, amount: u64) -> Result<()> {
    let subject_keys = &mut ctx.accounts.subject_keys;
    let seller = &mut ctx.accounts.seller;
    let subject = &mut ctx.accounts.subject;

    // Validate amount
    require!(amount > 0, SolSocialError::InvalidAmount);
    require!(
        ctx.accounts.seller_token_account.amount >= amount,
        SolSocialError::InsufficientKeys
    );

    // Cannot sell if it would leave supply at 0 and seller still has keys
    require!(
        subject_keys.supply > amount || ctx.accounts.seller_token_account.amount == amount,
        SolSocialError::CannotSellLastKey
    );

    // Calculate sell price using bonding curve
    let sell_price = calculate_sell_price(subject_keys.supply, amount)?;
    
    // Calculate protocol fee (2.5%)
    let protocol_fee = calculate_protocol_fee(sell_price)?;
    let creator_fee = sell_price
        .checked_mul(25)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_div(1000)
        .ok_or(SolSocialError::MathOverflow)?; // 2.5% to creator
    
    let seller_proceeds = sell_price
        .checked_sub(protocol_fee)
        .ok_or(SolSocialError::MathOverflow)?
        .checked_sub(creator_fee)
        .ok_or(SolSocialError::MathOverflow)?;

    // Burn tokens from seller
    let cpi_accounts = Transfer {
        from: ctx.accounts.seller_token_account.to_account_info(),
        to: ctx.accounts.subject_token_account.to_account_info(),
        authority: ctx.accounts.seller_wallet.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Update supply
    subject_keys.supply = subject_keys.supply
        .checked_sub(amount)
        .ok_or(SolSocialError::MathOverflow)?;

    // Transfer SOL to seller
    **ctx.accounts.seller_wallet.to_account_info().try_borrow_mut_lamports()? += seller_proceeds;

    // Transfer protocol fee
    **ctx.accounts.protocol_fee_account.to_account_info().try_borrow_mut_lamports()? += protocol_fee;

    // Transfer creator fee to subject
    **subject.to_account_info().try_borrow_mut_lamports()? += creator_fee;

    // Update seller's trading volume
    seller.total_trading_volume = seller.total_trading_volume
        .checked_add(sell_price)
        .ok_or(SolSocialError::MathOverflow)?;

    // Update subject's key metrics
    subject_keys.total_volume = subject_keys.total_volume
        .checked_add(sell_price)
        .ok_or(SolSocialError::MathOverflow)?;

    subject_keys.last_trade_timestamp = Clock::get()?.unix_timestamp;

    // Update subject's earnings
    subject.total_earnings = subject.total_earnings
        .checked_add(creator_fee)
        .ok_or(SolSocialError::MathOverflow)?;

    // Emit sell event
    emit!(KeysSoldEvent {
        seller: ctx.accounts.seller_wallet.key(),
        subject: subject_keys.subject,
        amount,
        price: sell_price,
        protocol_fee,
        creator_fee,
        new_supply: subject_keys.supply,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct KeysSoldEvent {
    pub seller: Pubkey,
    pub subject: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub protocol_fee: u64,
    pub creator_fee: u64,
    pub new_supply: u64,
    pub timestamp: i64,
}
```