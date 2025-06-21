```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solsocial } from "../target/types/solsocial";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { expect } from "chai";

describe("solsocial", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solsocial as Program<Solsocial>;
  
  let userKeypair: Keypair;
  let creatorKeypair: Keypair;
  let buyerKeypair: Keypair;
  let userPda: PublicKey;
  let creatorPda: PublicKey;
  let buyerPda: PublicKey;
  let userKeysPda: PublicKey;
  let creatorKeysPda: PublicKey;
  let postPda: PublicKey;
  let chatPda: PublicKey;
  let messagePda: PublicKey;

  before(async () => {
    userKeypair = Keypair.generate();
    creatorKeypair = Keypair.generate();
    buyerKeypair = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(userKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(creatorKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(buyerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive PDAs
    [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), userKeypair.publicKey.toBuffer()],
      program.programId
    );

    [creatorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), creatorKeypair.publicKey.toBuffer()],
      program.programId
    );

    [buyerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), buyerKeypair.publicKey.toBuffer()],
      program.programId
    );

    [userKeysPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("keys"), userKeypair.publicKey.toBuffer()],
      program.programId
    );

    [creatorKeysPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("keys"), creatorKeypair.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("User Management", () => {
    it("Initializes a user profile", async () => {
      const username = "testuser";
      const bio = "Test user bio";
      const profileImageUrl = "https://example.com/profile.jpg";

      await program.methods
        .initializeUser(username, bio, profileImageUrl)
        .accounts({
          user: userPda,
          authority: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();

      const userAccount = await program.account.user.fetch(userPda);
      expect(userAccount.authority.toString()).to.equal(userKeypair.publicKey.toString());
      expect(userAccount.username).to.equal(username);
      expect(userAccount.bio).to.equal(bio);
      expect(userAccount.profileImageUrl).to.equal(profileImageUrl);
      expect(userAccount.followersCount.toNumber()).to.equal(0);
      expect(userAccount.followingCount.toNumber()).to.equal(0);
      expect(userAccount.postsCount.toNumber()).to.equal(0);
    });

    it("Initializes creator profile", async () => {
      const username = "creator";
      const bio = "Content creator";
      const profileImageUrl = "https://example.com/creator.jpg";

      await program.methods
        .initializeUser(username, bio, profileImageUrl)
        .accounts({
          user: creatorPda,
          authority: creatorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creatorKeypair])
        .rpc();

      const creatorAccount = await program.account.user.fetch(creatorPda);
      expect(creatorAccount.authority.toString()).to.equal(creatorKeypair.publicKey.toString());
      expect(creatorAccount.username).to.equal(username);
    });

    it("Initializes buyer profile", async () => {
      const username = "buyer";
      const bio = "Key buyer";
      const profileImageUrl = "https://example.com/buyer.jpg";

      await program.methods
        .initializeUser(username, bio, profileImageUrl)
        .accounts({
          user: buyerPda,
          authority: buyerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyerKeypair])
        .rpc();

      const buyerAccount = await program.account.user.fetch(buyerPda);
      expect(buyerAccount.authority.toString()).to.equal(buyerKeypair.publicKey.toString());
      expect(buyerAccount.username).to.equal(username);
    });
  });

  describe("Key Trading", () => {
    it("Creates user keys with bonding curve", async () => {
      await program.methods
        .createKeys()
        .accounts({
          keys: userKeysPda,
          user: userPda,
          creator: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();

      const keysAccount = await program.account.userKeys.fetch(userKeysPda);
      expect(keysAccount.creator.toString()).to.equal(userKeypair.publicKey.toString());
      expect(keysAccount.totalSupply.toNumber()).to.equal(0);
      expect(keysAccount.totalVolume.toNumber()).to.equal(0);
      expect(keysAccount.creatorEarnings.toNumber()).to.equal(0);
    });

    it("Creates creator keys", async () => {
      await program.methods
        .createKeys()
        .accounts({
          keys: creatorKeysPda,
          user: creatorPda,
          creator: creatorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creatorKeypair])
        .rpc();

      const keysAccount = await program.account.userKeys.fetch(creatorKeysPda);
      expect(keysAccount.creator.toString()).to.equal(creatorKeypair.publicKey.toString());
      expect(keysAccount.totalSupply.toNumber()).to.equal(0);
    });

    it("Buys keys with correct pricing", async () => {
      const amount = new anchor.BN(1);
      
      // Calculate expected price for first key
      const expectedPrice = new anchor.BN(1000000); // Base price in lamports

      await program.methods
        .buyKeys(amount)
        .accounts({
          keys: creatorKeysPda,
          user: buyerPda,
          buyer: buyerKeypair.publicKey,
          creator: creatorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyerKeypair])
        .rpc();

      const keysAccount = await program.account.userKeys.fetch(creatorKeysPda);
      const buyerAccount = await program.account.user.fetch(buyerPda);

      expect(keysAccount.totalSupply.toNumber()).to.equal(1);
      expect(keysAccount.totalVolume.toNumber()).to.be.greaterThan(0);
      expect(buyerAccount.keysHeld.length).to.equal(1);
      expect(buyerAccount.keysHeld[0].creator.toString()).to.equal(creatorKeypair.publicKey.toString());
      expect(buyerAccount.keysHeld[0].amount.toNumber()).to.equal(1);
    });

    it("Buys multiple keys with increasing price", async () => {
      const amount = new anchor.BN(2);

      const keysBefore = await program.account.userKeys.fetch(creatorKeysPda);
      const supplyBefore = keysBefore.totalSupply.toNumber();

      await program.methods
        .buyKeys(amount)
        .accounts({
          keys: creatorKeysPda,
          user: buyerPda,
          buyer: buyerKeypair.publicKey,
          creator: creatorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyerKeypair])
        .rpc();

      const keysAfter = await program.account.userKeys.fetch(creatorKeysPda);
      expect(keysAfter.totalSupply.toNumber()).to.equal(supplyBefore + 2);
    });

    it("Sells keys with correct pricing", async () => {
      const amount = new anchor.BN(1);

      const keysBefore = await program.account.userKeys.fetch(creatorKeysPda);
      const supplyBefore = keysBefore.totalSupply.toNumber();

      await program.methods
        .sellKeys(amount)
        .accounts({
          keys: creatorKeysPda,
          user: buyerPda,
          seller: buyerKeypair.publicKey,
          creator: creatorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyerKeypair])
        .rpc();

      const keysAfter = await program.account.userKeys.fetch(creatorKeysPda);
      expect(keysAfter.totalSupply.toNumber()).to.equal(supplyBefore - 1);
    });

    it("Fails to sell more keys than owned", async () => {
      const amount = new anchor.BN(100);

      try {
        await program.methods
          .sellKeys(amount)
          .accounts({
            keys: creatorKeysPda,
            user: buyerPda,
            seller: buyerKeypair.publicKey,
            creator: creatorKeypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyerKeypair])
          .rpc();
        
        expect.fail("Should have failed");
      } catch (error) {
        expect(error.toString()).to.include("InsufficientKeys");
      }
    });
  });

  describe("Social Posts", () => {
    it("Creates a social post", async () => {
      const content = "This is my first post on SolSocial!";
      const imageUrl = "https://example.com/post-image.jpg";

      [postPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          userKeypair.publicKey.toBuffer(),
          new anchor.BN(0).toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );

      await program.methods
        .createPost(content, imageUrl)
        .accounts({
          post: postPda,
          user: userPda,
          author: userKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();

      const postAccount = await program.account.post.fetch(postPda);
      expect(postAccount.author.toString()).to.equal(userKeypair.publicKey.toString());
      expect(postAccount.content).to.equal(content);
      expect(postAccount.imageUrl).to.equal(imageUrl);
      expect(postAccount.likesCount.toNumber()).to.equal(0);
      expect(postAccount.commentsCount.toNumber()).to.equal(0);
      expect(postAccount.sharesCount.toNumber()).to.equal(0);

      const userAccount = await program.account.user.fetch(userPda);
      expect(userAccount.postsCount.toNumber()).to.equal(1);
    });

    it("Likes a post", async () => {
      await program.methods
        .interactPost({ like: {} })
        .accounts({
          post: postPda,
          user: buyerPda,
          interactor: buyerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyerKeypair])
        .rpc();

      const postAccount = await program.account.post.fetch(postPda);
      expect(postAccount.likesCount.toNumber()).to.equal(1);
    });

    it("Comments on a post", async () => {
      const comment = "Great post!";

      await program.methods
        .interactPost({ comment: { content: comment } })
        .accounts({
          post: postPda,
          user: buyerPda,
          interactor: buyerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyerKeypair])
        .rpc();

      const postAccount = await program.account.post.fetch(postPda);
      expect(postAccount.commentsCount.toNumber()).to.equal(1);
    });

    it("Shares a post", async () => {
      await program.methods
        .interactPost({ share: {} })
        .accounts({
          post: postPda,
          user: creatorPda,
          interactor: creatorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creatorKeypair])
        .rpc();

      const postAccount = await program.account.post.fetch(postPda);
      expect(postAccount.sharesCount.toNumber()).to.equal(1);
    });
  });

  describe("Chat System", () => {
    it("Creates a chat room", async () => {
      const roomName = "Private Chat";

      [chatPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("chat"),
          userKeypair.publicKey.toBuffer(),
          creatorKeypair.publicKey.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .createChat(roomName)
        .accounts({
          chat: chatPda,
          creator: userKeypair.publicKey,
          participant: creatorKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc();

      const chatAccount = await program.account.chat.fetch(chatPda);
      expect(chatAccount.creator.toString()).to.equal(userKeypair.publicKey.toString());
      expect(chatAccount.participant.toString()).to.equal(creatorKeypair.publicKey.toString());
      expect(chatAccount.roomName).to.equal(roomName);
      expect(chatAccount.messageCount.toNumber()).to.equal(0);
      expect(chatAccount.isActive).to.be.true;
    });

    it("Sends a message in chat", async () => {
      const messageContent = "Hello