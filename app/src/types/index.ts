```typescript
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// User Types
export interface User {
  address: PublicKey;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  keysIssued: BN;
  keysSupply: BN;
  keysPrice: BN;
  totalRevenue: BN;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: BN;
  isVerified: boolean;
}

export interface UserKeys {
  user: PublicKey;
  holder: PublicKey;
  amount: BN;
  purchasePrice: BN;
  purchasedAt: BN;
}

export interface KeysData {
  user: PublicKey;
  supply: BN;
  price: BN;
  totalVolume: BN;
  holders: number;
  createdAt: BN;
}

// Social Types
export interface Post {
  id: PublicKey;
  author: PublicKey;
  content: string;
  imageUrl?: string;
  timestamp: BN;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isGated: boolean;
  requiredKeys: BN;
  revenueGenerated: BN;
}

export interface PostInteraction {
  post: PublicKey;
  user: PublicKey;
  interactionType: InteractionType;
  timestamp: BN;
  content?: string; // For comments
}

export enum InteractionType {
  Like = 'like',
  Comment = 'comment',
  Share = 'share',
  Tip = 'tip'
}

export interface Comment {
  id: PublicKey;
  post: PublicKey;
  author: PublicKey;
  content: string;
  timestamp: BN;
  likesCount: number;
  parentComment?: PublicKey;
}

// Chat Types
export interface ChatRoom {
  id: PublicKey;
  creator: PublicKey;
  participant: PublicKey;
  requiredKeys: BN;
  isActive: boolean;
  createdAt: BN;
  lastMessageAt: BN;
  messagesCount: number;
}

export interface ChatMessage {
  id: PublicKey;
  room: PublicKey;
  sender: PublicKey;
  content: string;
  timestamp: BN;
  messageType: MessageType;
  isEncrypted: boolean;
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  File = 'file',
  System = 'system'
}

// Trading Types
export interface TradeOrder {
  id: PublicKey;
  user: PublicKey;
  targetUser: PublicKey;
  orderType: OrderType;
  amount: BN;
  price: BN;
  filled: BN;
  status: OrderStatus;
  createdAt: BN;
  expiresAt?: BN;
}

export enum OrderType {
  Buy = 'buy',
  Sell = 'sell'
}

export enum OrderStatus {
  Open = 'open',
  Filled = 'filled',
  Cancelled = 'cancelled',
  Expired = 'expired'
}

export interface TradeHistory {
  id: PublicKey;
  buyer: PublicKey;
  seller: PublicKey;
  targetUser: PublicKey;
  amount: BN;
  price: BN;
  timestamp: BN;
  fees: BN;
}

// Bonding Curve Types
export interface BondingCurveData {
  user: PublicKey;
  supply: BN;
  reserveBalance: BN;
  price: BN;
  marketCap: BN;
  volume24h: BN;
  priceChange24h: number;
  holders: number;
}

export interface PricePoint {
  supply: number;
  price: number;
  timestamp: number;
}

// Notification Types
export interface Notification {
  id: string;
  user: PublicKey;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  timestamp: BN;
}

export enum NotificationType {
  KeyPurchase = 'key_purchase',
  KeySale = 'key_sale',
  PostLike = 'post_like',
  PostComment = 'post_comment',
  PostShare = 'post_share',
  NewFollower = 'new_follower',
  ChatMessage = 'chat_message',
  PriceAlert = 'price_alert',
  System = 'system'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Component Props Types
export interface UserProfileProps {
  user: User;
  isOwner: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
}

export interface KeyTradingProps {
  user: User;
  keysData: KeysData;
  userKeys?: UserKeys;
  onBuy: (amount: number) => Promise<void>;
  onSell: (amount: number) => Promise<void>;
}

export interface SocialFeedProps {
  posts: Post[];
  loading: boolean;
  onLoadMore: () => void;
  onLike: (postId: PublicKey) => void;
  onComment: (postId: PublicKey, content: string) => void;
  onShare: (postId: PublicKey) => void;
}

export interface PostCreatorProps {
  onCreatePost: (content: string, imageUrl?: string, isGated?: boolean, requiredKeys?: number) => Promise<void>;
  loading: boolean;
}

export interface ChatRoomProps {
  room: ChatRoom;
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  loading: boolean;
}

export interface BondingCurveChartProps {
  data: PricePoint[];
  currentPrice: number;
  currentSupply: number;
  height?: number;
}

// Hook Return Types
export interface UseUserKeysReturn {
  userKeys: UserKeys[];
  keysData: Record<string, KeysData>;
  loading: boolean;
  error: string | null;
  buyKeys: (userAddress: PublicKey, amount: number) => Promise<void>;
  sellKeys: (userAddress: PublicKey, amount: number) => Promise<void>;
  refreshKeys: () => Promise<void>;
}

export interface UseSocialFeedReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  createPost: (content: string, imageUrl?: string, isGated?: boolean, requiredKeys?: number) => Promise<void>;
  likePost: (postId: PublicKey) => Promise<void>;
  commentPost: (postId: PublicKey, content: string) => Promise<void>;
  sharePost: (postId: PublicKey) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseChatReturn {
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  createRoom: (participantAddress: PublicKey, requiredKeys: number) => Promise<ChatRoom>;
  sendMessage: (roomId: PublicKey, content: string) => Promise<void>;
  loadMessages: (roomId: PublicKey) => Promise<void>;
  setActiveRoom: (room: ChatRoom | null) => void;
}

// Context Types
export interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
}

export interface ProgramContextType {
  program: any;
  connection: any;
  provider: any;
  loading: boolean;
  error: string | null;
}

// Form Types
export interface CreatePostForm {
  content: string;
  imageUrl?: string;
  isGated: boolean;
  requiredKeys?: number;
}

export interface EditProfileForm {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
}

export interface TradeForm {
  amount: number;
  orderType: OrderType;
  price?: number;
  expiresIn?: number;
}

// Error Types
export interface SolSocialError {
  code: number;
  message: string;
  details?: any;
}

// Utility Types
export type Address = string | PublicKey;

export interface TokenAmount {
  amount: BN;
  decimals: number;
  formatted: string;
}

export interface PriceData {
  current: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

// Event Types
export interface KeyTradeEvent {
  user: PublicKey;
  trader: PublicKey;
  amount: BN;
  price: BN;
  isBuy: boolean;
  timestamp: BN;
}

export interface PostCreatedEvent {
  post: PublicKey;
  author: PublicKey;
  timestamp: BN;
}

export interface MessageSentEvent {
  room: PublicKey;
  sender: PublicKey;
  timestamp: BN;
}

// Filter Types
export interface FeedFilter {
  following?: boolean;
  gated?: boolean;
  timeRange?: '1h' | '24h' | '7d' | '30d' | 'all';
  sortBy?: 'recent' | 'popular' | 'trending';
}

export interface UserFilter {
  verified?: boolean;
  hasKeys?: boolean;
  minFollowers?: number;
  sortBy?: 'followers' | 'keys_price' | 'recent' | 'volume';
}

export interface TradeFilter {
  user?: PublicKey;
  orderType?: OrderType;
  status?: OrderStatus;
  timeRange?: '1h' | '24h' | '7d' | '30d' | 'all';
}
```