```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum SolSocialError {
    #[msg("User profile already exists")]
    UserAlreadyExists,
    
    #[msg("User profile not found")]
    UserNotFound,
    
    #[msg("User keys already created")]
    KeysAlreadyCreated,
    
    #[msg("User keys not found")]
    KeysNotFound,
    
    #[msg("Insufficient keys to sell")]
    InsufficientKeys,
    
    #[msg("Cannot buy your own keys")]
    CannotBuyOwnKeys,
    
    #[msg("Cannot sell keys you don't own")]
    CannotSellKeysNotOwned,
    
    #[msg("Invalid key amount - must be greater than 0")]
    InvalidKeyAmount,
    
    #[msg("Insufficient SOL balance")]
    InsufficientBalance,
    
    #[msg("Price calculation overflow")]
    PriceOverflow,
    
    #[msg("Invalid bonding curve parameters")]
    InvalidBondingCurve,
    
    #[msg("Post not found")]
    PostNotFound,
    
    #[msg("Post content too long")]
    PostContentTooLong,
    
    #[msg("Post content cannot be empty")]
    PostContentEmpty,
    
    #[msg("Cannot interact with your own post")]
    CannotInteractOwnPost,
    
    #[msg("Already liked this post")]
    AlreadyLiked,
    
    #[msg("Not liked yet")]
    NotLiked,
    
    #[msg("Comment too long")]
    CommentTooLong,
    
    #[msg("Comment cannot be empty")]
    CommentEmpty,
    
    #[msg("Chat room not found")]
    ChatRoomNotFound,
    
    #[msg("Chat room already exists")]
    ChatRoomAlreadyExists,
    
    #[msg("Not authorized to access this chat")]
    NotAuthorizedForChat,
    
    #[msg("Message too long")]
    MessageTooLong,
    
    #[msg("Message cannot be empty")]
    MessageEmpty,
    
    #[msg("Invalid chat participants")]
    InvalidChatParticipants,
    
    #[msg("Chat room is full")]
    ChatRoomFull,
    
    #[msg("User not in chat room")]
    UserNotInChat,
    
    #[msg("Invalid username - too long")]
    UsernameTooLong,
    
    #[msg("Invalid username - cannot be empty")]
    UsernameEmpty,
    
    #[msg("Invalid username - contains invalid characters")]
    UsernameInvalidChars,
    
    #[msg("Username already taken")]
    UsernameAlreadyTaken,
    
    #[msg("Invalid bio - too long")]
    BioTooLong,
    
    #[msg("Invalid profile image URL")]
    InvalidProfileImageUrl,
    
    #[msg("Revenue share calculation error")]
    RevenueShareError,
    
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
    
    #[msg("Treasury account not found")]
    TreasuryNotFound,
    
    #[msg("Invalid treasury account")]
    InvalidTreasury,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Transaction deadline exceeded")]
    DeadlineExceeded,
    
    #[msg("Invalid signature")]
    InvalidSignature,
    
    #[msg("Account not initialized")]
    AccountNotInitialized,
    
    #[msg("Account already initialized")]
    AccountAlreadyInitialized,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    
    #[msg("Invalid program ID")]
    InvalidProgramId,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
    
    #[msg("Division by zero")]
    DivisionByZero,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    
    #[msg("Operation not allowed")]
    OperationNotAllowed,
    
    #[msg("Rate limit exceeded")]
    RateLimitExceeded,
    
    #[msg("Spam detected")]
    SpamDetected,
    
    #[msg("Content moderation violation")]
    ContentViolation,
    
    #[msg("Account suspended")]
    AccountSuspended,
    
    #[msg("Feature not implemented")]
    FeatureNotImplemented,
    
    #[msg("Invalid metadata")]
    InvalidMetadata,
    
    #[msg("Metadata too large")]
    MetadataTooLarge,
    
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    
    #[msg("Mint operation failed")]
    MintFailed,
    
    #[msg("Burn operation failed")]
    BurnFailed,
    
    #[msg("Invalid associated token account")]
    InvalidAssociatedTokenAccount,
    
    #[msg("Associated token account creation failed")]
    AssociatedTokenAccountCreationFailed,
    
    #[msg("Invalid system program")]
    InvalidSystemProgram,
    
    #[msg("Invalid token program")]
    InvalidTokenProgram,
    
    #[msg("Invalid associated token program")]
    InvalidAssociatedTokenProgram,
    
    #[msg("Invalid rent sysvar")]
    InvalidRentSysvar,
    
    #[msg("Invalid clock sysvar")]
    InvalidClockSysvar,
    
    #[msg("Insufficient rent exemption")]
    InsufficientRentExemption,
    
    #[msg("Account size mismatch")]
    AccountSizeMismatch,
    
    #[msg("Invalid discriminator")]
    InvalidDiscriminator,
    
    #[msg("Serialization error")]
    SerializationError,
    
    #[msg("Deserialization error")]
    DeserializationError,
    
    #[msg("Invalid instruction data")]
    InvalidInstructionData,
    
    #[msg("Missing required account")]
    MissingRequiredAccount,
    
    #[msg("Too many accounts provided")]
    TooManyAccounts,
    
    #[msg("Invalid account sequence")]
    InvalidAccountSequence,
    
    #[msg("Cross-program invocation failed")]
    CpiError,
    
    #[msg("Program upgrade required")]
    ProgramUpgradeRequired,
    
    #[msg("Feature disabled")]
    FeatureDisabled,
    
    #[msg("Maintenance mode active")]
    MaintenanceMode,
    
    #[msg("Invalid version")]
    InvalidVersion,
    
    #[msg("Deprecated instruction")]
    DeprecatedInstruction,
    
    #[msg("Emergency stop activated")]
    EmergencyStop,
}
```