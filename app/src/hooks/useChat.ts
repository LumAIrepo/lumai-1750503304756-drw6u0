```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { useProgram } from '../contexts/ProgramContext'
import { ChatRoom, ChatMessage } from '../types'
import { BN } from '@coral-xyz/anchor'

interface UseChatProps {
  roomId?: string
  recipientAddress?: string
}

interface ChatState {
  room: ChatRoom | null
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  isConnected: boolean
  canSendMessage: boolean
}

interface SendMessageParams {
  content: string
  messageType?: 'text' | 'image' | 'file'
  metadata?: Record<string, any>
}

export const useChat = ({ roomId, recipientAddress }: UseChatProps = {}) => {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { program, programId } = useProgram()
  
  const [state, setState] = useState<ChatState>({
    room: null,
    messages: [],
    isLoading: false,
    error: null,
    isConnected: false,
    canSendMessage: false
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout>()

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Get chat room PDA
  const getChatRoomPDA = useCallback((participant1: PublicKey, participant2: PublicKey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('chat_room'),
        participant1.toBuffer(),
        participant2.toBuffer()
      ],
      programId
    )
    return pda
  }, [programId])

  // Get message PDA
  const getMessagePDA = useCallback((roomPda: PublicKey, messageIndex: number) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('message'),
        roomPda.toBuffer(),
        new BN(messageIndex).toArrayLike(Buffer, 'le', 8)
      ],
      programId
    )
    return pda
  }, [programId])

  // Create or get existing chat room
  const createChatRoom = useCallback(async (recipientPubkey: PublicKey) => {
    if (!publicKey || !program || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const participant1 = publicKey.toBase58() < recipientPubkey.toBase58() ? publicKey : recipientPubkey
      const participant2 = publicKey.toBase58() < recipientPubkey.toBase58() ? recipientPubkey : publicKey
      
      const roomPda = getChatRoomPDA(participant1, participant2)

      // Check if room already exists
      try {
        const existingRoom = await program.account.chatRoom.fetch(roomPda)
        setState(prev => ({ 
          ...prev, 
          room: {
            address: roomPda.toBase58(),
            participant1: existingRoom.participant1.toBase58(),
            participant2: existingRoom.participant2.toBase58(),
            messageCount: existingRoom.messageCount,
            createdAt: existingRoom.createdAt.toNumber(),
            lastMessageAt: existingRoom.lastMessageAt.toNumber(),
            isActive: existingRoom.isActive
          },
          isLoading: false,
          isConnected: true,
          canSendMessage: true
        }))
        return roomPda
      } catch (error) {
        // Room doesn't exist, create it
      }

      const tx = await program.methods
        .createChat()
        .accounts({
          chatRoom: roomPda,
          participant1,
          participant2,
          payer: publicKey,
          systemProgram: PublicKey.default
        })
        .transaction()

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Fetch the created room
      const createdRoom = await program.account.chatRoom.fetch(roomPda)
      setState(prev => ({ 
        ...prev, 
        room: {
          address: roomPda.toBase58(),
          participant1: createdRoom.participant1.toBase58(),
          participant2: createdRoom.participant2.toBase58(),
          messageCount: createdRoom.messageCount,
          createdAt: createdRoom.createdAt.toNumber(),
          lastMessageAt: createdRoom.lastMessageAt.toNumber(),
          isActive: createdRoom.isActive
        },
        isLoading: false,
        isConnected: true,
        canSendMessage: true
      }))

      return roomPda
    } catch (error) {
      console.error('Error creating chat room:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create chat room',
        isLoading: false
      }))
      throw error
    }
  }, [publicKey, program, signTransaction, connection, getChatRoomPDA])

  // Send message
  const sendMessage = useCallback(async ({ content, messageType = 'text', metadata }: SendMessageParams) => {
    if (!publicKey || !program || !signTransaction || !state.room) {
      throw new Error('Chat not initialized')
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const roomPda = new PublicKey(state.room.address)
      const messagePda = getMessagePDA(roomPda, state.room.messageCount)

      const tx = await program.methods
        .sendMessage(content, messageType, metadata || {})
        .accounts({
          chatRoom: roomPda,
          message: messagePda,
          sender: publicKey,
          systemProgram: PublicKey.default
        })
        .transaction()

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Update room message count
      setState(prev => ({
        ...prev,
        room: prev.room ? {
          ...prev.room,
          messageCount: prev.room.messageCount + 1,
          lastMessageAt: Date.now()
        } : null,
        isLoading: false
      }))

      // Fetch updated messages
      await fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false
      }))
      throw error
    }
  }, [publicKey, program, signTransaction, connection, state.room, getMessagePDA])

  // Fetch messages for current room
  const fetchMessages = useCallback(async () => {
    if (!program || !state.room) return

    try {
      const roomPda = new PublicKey(state.room.address)
      const messages: ChatMessage[] = []

      // Fetch all messages for this room
      for (let i = 0; i < state.room.messageCount; i++) {
        try {
          const messagePda = getMessagePDA(roomPda, i)
          const messageAccount = await program.account.chatMessage.fetch(messagePda)
          
          messages.push({
            id: messagePda.toBase58(),
            roomId: state.room.address,
            sender: messageAccount.sender.toBase58(),
            content: messageAccount.content,
            messageType: messageAccount.messageType,
            metadata: messageAccount.metadata,
            timestamp: messageAccount.timestamp.toNumber(),
            isEdited: messageAccount.isEdited,
            editedAt: messageAccount.editedAt?.toNumber()
          })
        } catch (error) {
          console.warn(`Failed to fetch message ${i}:`, error)
        }
      }

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp)

      setState(prev => ({ ...prev, messages }))
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch messages'
      }))
    }
  }, [program, state.room, getMessagePDA, scrollToBottom])

  // Initialize chat room
  const initializeChat = useCallback(async () => {
    if (!publicKey || !program) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      if (roomId) {
        // Load existing room by ID
        try {
          const roomPda = new PublicKey(roomId)
          const room = await program.account.chatRoom.fetch(roomPda)
          
          setState(prev => ({ 
            ...prev, 
            room: {
              address: roomPda.toBase58(),
              participant1: room.participant1.toBase58(),
              participant2: room.participant2.toBase58(),
              messageCount: room.messageCount,
              createdAt: room.createdAt.toNumber(),
              lastMessageAt: room.lastMessageAt.toNumber(),
              isActive: room.isActive
            },
            isConnected: true,
            canSendMessage: room.participant1.equals(publicKey) || room.participant2.equals(publicKey),
            isLoading: false
          }))
        } catch (error) {
          throw new Error('Chat room not found')
        }
      } else if (recipientAddress) {
        // Create or get room with recipient
        const recipientPubkey = new PublicKey(recipientAddress)
        await createChatRoom(recipientPubkey)
      }
    } catch (error) {
      console.error('Error initializing chat:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize chat',
        isLoading: false
      }))
    }
  }, [publicKey, program, roomId, recipientAddress, createChatRoom])

  // Start polling for new messages
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(() => {
      if (state.room && !state.isLoading) {
        fetchMessages()
      }
    }, 3000) // Poll every 3 seconds
  }, [state.room, state.isLoading, fetchMessages])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = undefined
    }
  }, [])

  // Mark messages as read (placeholder for future implementation)
  const markAsRead = useCallback(async () => {
    // TODO: Implement read receipts in program
    console.log('Mark as read - not implemented yet')
  }, [])

  // Get other participant in the chat
  const getOtherParticipant = useCallback(() => {
    if (!state.room || !publicKey) return null
    
    const myAddress = publicKey.toBase58()
    return state.room.participant1 === myAddress 
      ? state.room.participant2 
      : state.room.participant1
  }, [state.room, publicKey])

  // Initialize chat when component mounts or dependencies change
  useEffect(() => {
    if (publicKey && program && (roomId || recipientAddress)) {
      initializeChat()
    }
  }, [publicKey, program, roomId, recipientAddress, initializeChat])

  // Fetch messages when room is loaded
  useEffect(() => {
    if (state.room && state.isConnected) {
      fetchMessages()
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [state.room, state.isConnected, fetchMessages, startPolling, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    // State
    room: state.room,
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isConnected: state.isConnected,
    canSendMessage: state.canSendMessage,
    
    // Actions
    sendMessage,
    createChatRoom,
    fetchMessages,
    markAsRead,
    initializeChat,
    
    // Utilities
    getOtherParticipant,
    messagesEndRef,
    
    // Polling controls
    startPolling,
    stopPolling
  }
}

export default useChat
```