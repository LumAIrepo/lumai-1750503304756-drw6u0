```typescript
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { SolSocial } from '../types/solsocial';
import idl from '../idl/solsocial.json';

export const PROGRAM_ID = new PublicKey('SoLSociaL1111111111111111111111111111111111');
export const SOLSOCIAL_SEED = 'solsocial';
export const USER_SEED = 'user';
export const KEYS_SEED = 'keys';
export const POST_SEED = 'post';
export const CHAT_SEED = 'chat';
export const MESSAGE_SEED = 'message';

export type UserAccount = IdlAccounts<SolSocial>['user'];
export type KeysAccount = IdlAccounts<SolSocial>['keys'];
export type PostAccount = IdlAccounts<SolSocial>['post'];
export type ChatAccount = IdlAccounts<SolSocial>['chat'];
export type MessageAccount = IdlAccounts<SolSocial>['message'];

export class SolSocialProgram {
  private program: Program<SolSocial>;
  private provider: AnchorProvider;

  constructor(connection: Connection, wallet: any) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    this.program = new Program(idl as SolSocial, PROGRAM_ID, this.provider);
  }

  // PDA derivation helpers
  static findUserPDA(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(USER_SEED), authority.toBuffer()],
      PROGRAM_ID
    );
  }

  static findKeysPDA(creator: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(KEYS_SEED), creator.toBuffer()],
      PROGRAM_ID
    );
  }

  static findPostPDA(creator: PublicKey, postId: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(POST_SEED), creator.toBuffer(), postId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
  }

  static findChatPDA(creator: PublicKey, participant: PublicKey): [PublicKey, number] {
    const [first, second] = [creator, participant].sort((a, b) => 
      a.toBuffer().compare(b.toBuffer())
    );
    return PublicKey.findProgramAddressSync(
      [Buffer.from(CHAT_SEED), first.toBuffer(), second.toBuffer()],
      PROGRAM_ID
    );
  }

  static findMessagePDA(chat: PublicKey, messageId: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(MESSAGE_SEED), chat.toBuffer(), messageId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
  }

  // User operations
  async initializeUser(
    authority: PublicKey,
    username: string,
    displayName: string,
    bio: string,
    profileImage: string
  ) {
    const [userPDA] = SolSocialProgram.findUserPDA(authority);

    return await this.program.methods
      .initializeUser(username, displayName, bio, profileImage)
      .accounts({
        user: userPDA,
        authority,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  async getUser(authority: PublicKey): Promise<UserAccount | null> {
    try {
      const [userPDA] = SolSocialProgram.findUserPDA(authority);
      return await this.program.account.user.fetch(userPDA);
    } catch {
      return null;
    }
  }

  // Keys operations
  async createKeys(creator: PublicKey) {
    const [keysPDA] = SolSocialProgram.findKeysPDA(creator);
    const [userPDA] = SolSocialProgram.findUserPDA(creator);

    return await this.program.methods
      .createKeys()
      .accounts({
        keys: keysPDA,
        user: userPDA,
        creator,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  async buyKeys(
    buyer: PublicKey,
    creator: PublicKey,
    amount: number,
    maxPrice: BN
  ) {
    const [keysPDA] = SolSocialProgram.findKeysPDA(creator);
    const [buyerUserPDA] = SolSocialProgram.findUserPDA(buyer);
    const [creatorUserPDA] = SolSocialProgram.findUserPDA(creator);

    return await this.program.methods
      .buyKeys(new BN(amount), maxPrice)
      .accounts({
        keys: keysPDA,
        buyerUser: buyerUserPDA,
        creatorUser: creatorUserPDA,
        buyer,
        creator,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async sellKeys(
    seller: PublicKey,
    creator: PublicKey,
    amount: number,
    minPrice: BN
  ) {
    const [keysPDA] = SolSocialProgram.findKeysPDA(creator);
    const [sellerUserPDA] = SolSocialProgram.findUserPDA(seller);
    const [creatorUserPDA] = SolSocialProgram.findUserPDA(creator);

    return await this.program.methods
      .sellKeys(new BN(amount), minPrice)
      .accounts({
        keys: keysPDA,
        sellerUser: sellerUserPDA,
        creatorUser: creatorUserPDA,
        seller,
        creator,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async getKeys(creator: PublicKey): Promise<KeysAccount | null> {
    try {
      const [keysPDA] = SolSocialProgram.findKeysPDA(creator);
      return await this.program.account.keys.fetch(keysPDA);
    } catch {
      return null;
    }
  }

  // Post operations
  async createPost(
    creator: PublicKey,
    content: string,
    mediaUrl?: string,
    replyTo?: PublicKey
  ) {
    const [userPDA] = SolSocialProgram.findUserPDA(creator);
    const user = await this.getUser(creator);
    if (!user) throw new Error('User not found');

    const postId = user.postCount;
    const [postPDA] = SolSocialProgram.findPostPDA(creator, postId);

    const accounts: any = {
      post: postPDA,
      user: userPDA,
      creator,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };

    if (replyTo) {
      accounts.replyTo = replyTo;
    }

    return await this.program.methods
      .createPost(content, mediaUrl || null, replyTo || null)
      .accounts(accounts)
      .rpc();
  }

  async interactPost(
    user: PublicKey,
    post: PublicKey,
    interactionType: 'like' | 'comment' | 'share',
    content?: string
  ) {
    const [userPDA] = SolSocialProgram.findUserPDA(user);

    const interaction = {
      like: { like: {} },
      comment: { comment: {} },
      share: { share: {} },
    }[interactionType];

    return await this.program.methods
      .interactPost(interaction, content || null)
      .accounts({
        post,
        user: userPDA,
        authority: user,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async getPost(creator: PublicKey, postId: BN): Promise<PostAccount | null> {
    try {
      const [postPDA] = SolSocialProgram.findPostPDA(creator, postId);
      return await this.program.account.post.fetch(postPDA);
    } catch {
      return null;
    }
  }

  async getUserPosts(creator: PublicKey): Promise<PostAccount[]> {
    const user = await this.getUser(creator);
    if (!user) return [];

    const posts: PostAccount[] = [];
    for (let i = 0; i < user.postCount.toNumber(); i++) {
      const post = await this.getPost(creator, new BN(i));
      if (post) posts.push(post);
    }
    return posts;
  }

  // Chat operations
  async createChat(creator: PublicKey, participant: PublicKey) {
    const [chatPDA] = SolSocialProgram.findChatPDA(creator, participant);
    const [creatorUserPDA] = SolSocialProgram.findUserPDA(creator);
    const [participantUserPDA] = SolSocialProgram.findUserPDA(participant);

    return await this.program.methods
      .createChat()
      .accounts({
        chat: chatPDA,
        creatorUser: creatorUserPDA,
        participantUser: participantUserPDA,
        creator,
        participant,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  async sendMessage(
    sender: PublicKey,
    recipient: PublicKey,
    content: string,
    mediaUrl?: string
  ) {
    const [chatPDA] = SolSocialProgram.findChatPDA(sender, recipient);
    const [senderUserPDA] = SolSocialProgram.findUserPDA(sender);
    
    const chat = await this.getChat(sender, recipient);
    if (!chat) throw new Error('Chat not found');

    const messageId = chat.messageCount;
    const [messagePDA] = SolSocialProgram.findMessagePDA(chatPDA, messageId);

    return await this.program.methods
      .sendMessage(content, mediaUrl || null)
      .accounts({
        message: messagePDA,
        chat: chatPDA,
        senderUser: senderUserPDA,
        sender,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  async getChat(creator: PublicKey, participant: PublicKey): Promise<ChatAccount | null> {
    try {
      const [chatPDA] = SolSocialProgram.findChatPDA(creator, participant);
      return await this.program.account.chat.fetch(chatPDA);
    } catch {
      return null;
    }
  }

  async getChatMessages(creator: PublicKey, participant: PublicKey): Promise<MessageAccount[]> {
    const chat = await this.getChat(creator, participant);
    if (!chat) return [];

    const [chatPDA] = SolSocialProgram.findChatPDA(creator, participant);
    const messages: MessageAccount[] = [];
    
    for (let i = 0; i < chat.messageCount.toNumber(); i++) {
      try {
        const [messagePDA] = SolSocialProgram.findMessagePDA(chatPDA, new BN(i));
        const message = await this.program.account.message.fetch(messagePDA);
        messages.push(message);
      } catch {
        // Skip failed messages
      }
    }
    return messages;
  }

  // Utility methods
  async getAllUsers(): Promise<UserAccount[]> {
    return await this.program.account.user.all();
  }

  async getAllPosts(): Promise<PostAccount[]> {
    return await this.program.account.post.all();
  }

  async getKeyPrice(creator: PublicKey, amount: number, isBuy: boolean): Promise<BN> {
    const keys = await this.getKeys(creator);
    if (!keys) return new BN(0);

    // Bonding curve calculation: price = supply^2 / 16000
    const supply = keys.supply.toNumber();
    let totalPrice = new BN(0);

    for (let i = 0; i < amount; i++) {
      const currentSupply = isBuy ? supply + i : supply - i - 1;
      const price = Math.floor((currentSupply * currentSupply) / 16000);
      totalPrice = totalPrice.add(new BN(price));
    }

    return totalPrice;
  }

  // Event listeners
  addEventListener(eventName: string, callback: (event: any) => void) {
    return this.program.addEventListener(eventName, callback);
  }

  removeEventListener(listenerId: number) {
    return this.program.removeEventListener(listenerId);
  }

  // Program getters
  get programId(): PublicKey {
    return this.program.programId;
  }

  get provider(): AnchorProvider {
    return this.provider;
  }

  get connection(): Connection {
    return this.provider.connection;
  }
}

export default SolSocialProgram;
```