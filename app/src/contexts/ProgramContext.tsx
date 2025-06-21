```tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, web3, BN, IdlAccounts } from '@coral-xyz/anchor'
import { SolSocial } from '../types/solsocial'
import { IDL } from '../types/solsocial'

const PROGRAM_ID = new PublicKey('SoLSociaL1111111111111111111111111111111111')

export type UserAccount = IdlAccounts<SolSocial>['user']
export type KeysAccount = IdlAccounts<SolSocial>['keys']
export type PostAccount = IdlAccounts<SolSocial>['post']
export type ChatAccount = IdlAccounts<SolSocial>['chat']
export type MessageAccount = IdlAccounts<SolSocial>['message']

interface ProgramContextType {
  program: Program<SolSocial> | null
  provider: AnchorProvider | null
  isLoading: boolean
  error: string | null
  
  // User operations
  initializeUser: (username: string, bio: string) => Promise<string>
  getUserAccount: (userPubkey: PublicKey) => Promise<UserAccount | null>
  
  // Key operations
  createKeys: (name: string, symbol: string) => Promise<string>
  buyKeys: (keysPubkey: PublicKey, amount: number) => Promise<string>
  sellKeys: (keysPubkey: PublicKey, amount: number) => Promise<string>
  getKeysAccount: (keysPubkey: PublicKey) => Promise<KeysAccount | null>
  
  // Post operations
  createPost: (content: string, mediaUrl?: string) => Promise<string>
  interactPost: (postPubkey: PublicKey, interactionType: 'like' | 'comment' | 'share', content?: string) => Promise<string>
  getPostAccount: (postPubkey: PublicKey) => Promise<PostAccount | null>
  getUserPosts: (userPubkey: PublicKey) => Promise<PostAccount[]>
  
  // Chat operations
  createChat: (participantPubkey: PublicKey) => Promise<string>
  sendMessage: (chatPubkey: PublicKey, content: string) => Promise<string>
  getChatAccount: (chatPubkey: PublicKey) => Promise<ChatAccount | null>
  getChatMessages: (chatPubkey: PublicKey) => Promise<MessageAccount[]>
  
  // Utility functions
  calculateKeyPrice: (supply: number, amount: number) => number
  getKeyHolders: (keysPubkey: PublicKey) => Promise<{ holder: PublicKey; amount: number }[]>
}

const ProgramContext = createContext<ProgramContextType | null>(null)

export const useProgramContext = () => {
  const context = useContext(ProgramContext)
  if (!context) {
    throw new Error('useProgramContext must be used within a ProgramProvider')
  }
  return context
}

interface ProgramProviderProps {
  children: ReactNode
}

export const ProgramProvider: React.FC<ProgramProviderProps> = ({ children }) => {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [program, setProgram] = useState<Program<SolSocial> | null>(null)
  const [provider, setProvider] = useState<AnchorProvider | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setProgram(null)
      setProvider(null)
      setIsLoading(false)
      return
    }

    try {
      const anchorProvider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      )
      
      const anchorProgram = new Program<SolSocial>(IDL, PROGRAM_ID, anchorProvider)
      
      setProvider(anchorProvider)
      setProgram(anchorProgram)
      setError(null)
    } catch (err) {
      console.error('Failed to initialize program:', err)
      setError('Failed to initialize program')
    } finally {
      setIsLoading(false)
    }
  }, [connection, wallet.publicKey, wallet.signTransaction])

  const getUserPDA = (userPubkey: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('user'), userPubkey.toBuffer()],
      PROGRAM_ID
    )[0]
  }

  const getKeysPDA = (userPubkey: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('keys'), userPubkey.toBuffer()],
      PROGRAM_ID
    )[0]
  }

  const getPostPDA = (userPubkey: PublicKey, postId: BN) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('post'), userPubkey.toBuffer(), postId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    )[0]
  }

  const getChatPDA = (user1: PublicKey, user2: PublicKey) => {
    const [smaller, larger] = [user1, user2].sort((a, b) => 
      a.toBuffer().compare(b.toBuffer())
    )
    return PublicKey.findProgramAddressSync(
      [Buffer.from('chat'), smaller.toBuffer(), larger.toBuffer()],
      PROGRAM_ID
    )[0]
  }

  const getMessagePDA = (chatPubkey: PublicKey, messageId: BN) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('message'), chatPubkey.toBuffer(), messageId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    )[0]
  }

  const initializeUser = async (username: string, bio: string): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const userPDA = getUserPDA(wallet.publicKey)
    
    const tx = await program.methods
      .initializeUser(username, bio)
      .accounts({
        user: userPDA,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const getUserAccount = async (userPubkey: PublicKey): Promise<UserAccount | null> => {
    if (!program) return null

    try {
      const userPDA = getUserPDA(userPubkey)
      const account = await program.account.user.fetch(userPDA)
      return account
    } catch {
      return null
    }
  }

  const createKeys = async (name: string, symbol: string): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const keysPDA = getKeysPDA(wallet.publicKey)
    
    const tx = await program.methods
      .createKeys(name, symbol)
      .accounts({
        keys: keysPDA,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const buyKeys = async (keysPubkey: PublicKey, amount: number): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const tx = await program.methods
      .buyKeys(new BN(amount))
      .accounts({
        keys: keysPubkey,
        buyer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const sellKeys = async (keysPubkey: PublicKey, amount: number): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const tx = await program.methods
      .sellKeys(new BN(amount))
      .accounts({
        keys: keysPubkey,
        seller: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const getKeysAccount = async (keysPubkey: PublicKey): Promise<KeysAccount | null> => {
    if (!program) return null

    try {
      const account = await program.account.keys.fetch(keysPubkey)
      return account
    } catch {
      return null
    }
  }

  const createPost = async (content: string, mediaUrl?: string): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const userAccount = await getUserAccount(wallet.publicKey)
    if (!userAccount) throw new Error('User account not found')

    const postId = new BN(userAccount.postCount)
    const postPDA = getPostPDA(wallet.publicKey, postId)
    
    const tx = await program.methods
      .createPost(content, mediaUrl || null)
      .accounts({
        post: postPDA,
        user: getUserPDA(wallet.publicKey),
        author: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const interactPost = async (
    postPubkey: PublicKey, 
    interactionType: 'like' | 'comment' | 'share', 
    content?: string
  ): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const interaction = interactionType === 'like' ? { like: {} } : 
                       interactionType === 'comment' ? { comment: {} } : 
                       { share: {} }

    const tx = await program.methods
      .interactPost(interaction, content || null)
      .accounts({
        post: postPubkey,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const getPostAccount = async (postPubkey: PublicKey): Promise<PostAccount | null> => {
    if (!program) return null

    try {
      const account = await program.account.post.fetch(postPubkey)
      return account
    } catch {
      return null
    }
  }

  const getUserPosts = async (userPubkey: PublicKey): Promise<PostAccount[]> => {
    if (!program) return []

    try {
      const posts = await program.account.post.all([
        {
          memcmp: {
            offset: 8,
            bytes: userPubkey.toBase58(),
          },
        },
      ])
      return posts.map(p => p.account)
    } catch {
      return []
    }
  }

  const createChat = async (participantPubkey: PublicKey): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const chatPDA = getChatPDA(wallet.publicKey, participantPubkey)
    
    const tx = await program.methods
      .createChat()
      .accounts({
        chat: chatPDA,
        user1: wallet.publicKey,
        user2: participantPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const sendMessage = async (chatPubkey: PublicKey, content: string): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized')

    const chatAccount = await getChatAccount(chatPubkey)
    if (!chatAccount) throw new Error('Chat not found')

    const messageId = new BN(chatAccount.messageCount)
    const messagePDA = getMessagePDA(chatPubkey, messageId)
    
    const tx = await program.methods
      .sendMessage(content)
      .accounts({
        message: messagePDA,
        chat: chatPubkey,
        sender: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return tx
  }

  const getChatAccount = async (chatPubkey: PublicKey): Promise<ChatAccount | null> => {
    if (!program) return null

    try {
      const account = await program.account.chat.fetch(chatPubkey)
      return account
    } catch {
      return null
    }
  }

  const getChatMessages = async (chatPubkey: PublicKey): Promise<MessageAccount[]> => {
    if (!program) return []

    try {
      const messages = await program.account.message.all([
        {
          memcmp: {
            offset: 8,
            bytes: chatPubkey.toBase58(),
          },
        },
      ])
      return messages.map(m => m.account).sort((a, b) => 
        a.timestamp.toNumber() - b.timestamp.toNumber()
      )
    } catch {
      return []
    }
  }

  const calculateKeyPrice = (supply: number, amount: number): number => {
    const sum1 = supply === 0 ? 0 : (supply - 1) * supply * (2 * (supply - 1) + 1) / 6
    const sum2 = (supply + amount - 1) * (supply + amount) * (2 * (supply + amount - 1) + 1) / 6
    const summation = sum2 - sum1
    return summation * 1000 / 16000
  }

  const getKeyHolders = async (keysPubkey: PublicKey): Promise<{ holder: PublicKey; amount: number }[]> => {
    if (!program) return []

    try {
      const keysAccount = await getKeysAccount(keysPubkey)
      if (!keysAccount) return []

      return keysAccount.holders.map(holder => ({
        holder: holder.holder,
        amount: holder.amount.toNumber(),
      }))
    } catch {
      return []
    }
  }

  const contextValue: ProgramContextType = {
    program,
    provider,
    isLoading,
    error,
    initializeUser,
    getUserAccount,
    createKeys,
    buyKeys,
    sellKeys,
    getKeysAccount,
    createPost,
    interactPost,
    getPostAccount,
    getUserPosts,
    createChat,
    sendMessage,
    getChatAccount,
    getChatMessages,
    calculateKeyPrice,
    getKeyHolders,
  }

  return (
    <ProgramContext.Provider value={contextValue}>
      {children}
    </ProgramContext.Provider>
  )
}

export default ProgramProvider
```