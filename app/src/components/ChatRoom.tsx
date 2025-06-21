```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send, Users, Lock, Verified } from 'lucide-react'
import { useChat } from '@/hooks/useChat'

interface ChatMessage {
  id: string
  sender: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: number
  isOwner: boolean
}

interface ChatParticipant {
  address: string
  name: string
  avatar?: string
  keysHeld: number
  isOnline: boolean
}

interface ChatRoomProps {
  roomId: string
  creatorAddress: string
  creatorName: string
  creatorAvatar?: string
  requiredKeys: number
  participantCount: number
}

export default function ChatRoom({
  roomId,
  creatorAddress,
  creatorName,
  creatorAvatar,
  requiredKeys,
  participantCount
}: ChatRoomProps) {
  const { publicKey } = useWallet()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<ChatParticipant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [userKeysHeld, setUserKeysHeld] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { sendMessage, subscribeToMessages, checkAccess } = useChat()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!publicKey || !roomId) return

    const initializeChat = async () => {
      setIsLoading(true)
      try {
        // Check if user has access to this chat room
        const access = await checkAccess(roomId, publicKey.toString())
        setHasAccess(access.hasAccess)
        setUserKeysHeld(access.keysHeld)

        if (access.hasAccess) {
          // Subscribe to messages
          const unsubscribe = subscribeToMessages(roomId, (newMessages) => {
            setMessages(newMessages)
          })

          // Load initial messages and participants
          loadChatData()

          return unsubscribe
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeChat()
  }, [publicKey, roomId])

  const loadChatData = async () => {
    // Mock data - replace with actual program calls
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        sender: creatorAddress,
        senderName: creatorName,
        senderAvatar: creatorAvatar,
        content: 'Welcome to my exclusive chat! Thanks for holding my keys 🔑',
        timestamp: Date.now() - 3600000,
        isOwner: true
      },
      {
        id: '2',
        sender: 'user1',
        senderName: 'CryptoTrader',
        content: 'Excited to be here! Your content has been amazing',
        timestamp: Date.now() - 1800000,
        isOwner: false
      },
      {
        id: '3',
        sender: 'user2',
        senderName: 'DeFiMaxi',
        content: 'When are you dropping the alpha? 👀',
        timestamp: Date.now() - 900000,
        isOwner: false
      }
    ]

    const mockParticipants: ChatParticipant[] = [
      {
        address: creatorAddress,
        name: creatorName,
        avatar: creatorAvatar,
        keysHeld: 0,
        isOnline: true
      },
      {
        address: 'user1',
        name: 'CryptoTrader',
        keysHeld: 5,
        isOnline: true
      },
      {
        address: 'user2',
        name: 'DeFiMaxi',
        keysHeld: 3,
        isOnline: false
      },
      {
        address: 'user3',
        name: 'SolanaBuilder',
        keysHeld: 8,
        isOnline: true
      }
    ]

    setMessages(mockMessages)
    setParticipants(mockParticipants)
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !publicKey || !hasAccess) return

    setIsLoading(true)
    try {
      await sendMessage(roomId, message.trim())
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!publicKey) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900 border-gray-800">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Lock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Connect Wallet Required
            </h3>
            <p className="text-gray-400">
              Please connect your wallet to access this chat room
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasAccess) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-900 border-gray-800">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Lock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Access Required
            </h3>
            <p className="text-gray-400 mb-4">
              You need to hold at least {requiredKeys} keys from {creatorName} to access this chat
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You currently hold: {userKeysHeld} keys
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Buy Keys to Join
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Chat Area */}
      <Card className="lg:col-span-3 bg-gray-900 border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={creatorAvatar} />
                <AvatarFallback className="bg-blue-600">
                  {creatorName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  {creatorName}
                  <Verified className="h-4 w-4 text-blue-500" />
                </CardTitle>
                <p className="text-sm text-gray-400">
                  Private Chat • {participantCount} members
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">
              <Lock className="h-3 w-3 mr-1" />
              {requiredKeys} keys required
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages */}
          <ScrollArea className="h-96 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${
                    msg.sender === publicKey.toString() ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.senderAvatar} />
                    <AvatarFallback className="bg-gray-700 text-xs">
                      {msg.senderName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${msg.sender === publicKey.toString() ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {msg.senderName}
                      </span>
                      {msg.isOwner && (
                        <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 text-xs">
                          Creator
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${
                        msg.sender === publicKey.toString()
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants Sidebar */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.address}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="bg-gray-700 text-xs">
                        {participant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {participant.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {participant.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {participant.address === creatorAddress 
                        ? 'Creator' 
                        : `${participant.keysHeld} keys`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
```