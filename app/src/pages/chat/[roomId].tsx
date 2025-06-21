```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@/hooks/useChat'
import { useUserKeys } from '@/hooks/useUserKeys'
import { Send, ArrowLeft, Users, Key, Loader2 } from 'lucide-react'

interface Message {
  id: string
  sender: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: Date
  isOwn: boolean
}

interface ChatParticipant {
  address: string
  name: string
  avatar?: string
  keyBalance: number
  isOnline: boolean
}

export default function ChatRoomPage() {
  const router = useRouter()
  const { roomId } = router.query
  const { publicKey } = useWallet()
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { 
    messages, 
    participants, 
    chatRoom, 
    sendMessage, 
    loadMessages,
    isConnected 
  } = useChat(roomId as string)

  const { userKeys, hasAccess } = useUserKeys()

  // Mock data for development
  const mockMessages: Message[] = [
    {
      id: '1',
      sender: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      senderName: 'Alice',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      content: 'Hey everyone! Welcome to my exclusive chat room 🎉',
      timestamp: new Date(Date.now() - 3600000),
      isOwn: false
    },
    {
      id: '2',
      sender: publicKey?.toString() || '',
      senderName: 'You',
      content: 'Thanks for having me! Excited to be here',
      timestamp: new Date(Date.now() - 1800000),
      isOwn: true
    },
    {
      id: '3',
      sender: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      senderName: 'Bob',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      content: 'The key price has been going up! Great community here 📈',
      timestamp: new Date(Date.now() - 900000),
      isOwn: false
    }
  ]

  const mockParticipants: ChatParticipant[] = [
    {
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      name: 'Alice',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      keyBalance: 5,
      isOnline: true
    },
    {
      address: publicKey?.toString() || '',
      name: 'You',
      keyBalance: 2,
      isOnline: true
    },
    {
      address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      name: 'Bob',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      keyBalance: 3,
      isOnline: false
    }
  ]

  const mockChatRoom = {
    id: roomId as string,
    creator: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    creatorName: 'Alice',
    title: "Alice's Exclusive Chat",
    description: 'Premium chat room for key holders',
    minKeysRequired: 1,
    participantCount: 12,
    isActive: true,
    createdAt: new Date(Date.now() - 86400000)
  }

  const displayMessages = messages.length > 0 ? messages : mockMessages
  const displayParticipants = participants.length > 0 ? participants : mockParticipants
  const displayChatRoom = chatRoom || mockChatRoom

  useEffect(() => {
    if (roomId && publicKey) {
      loadMessages()
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [roomId, publicKey])

  useEffect(() => {
    scrollToBottom()
  }, [displayMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !publicKey || isSending) return

    setIsSending(true)
    try {
      if (sendMessage) {
        await sendMessage(message)
      }
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <span className="text-gray-300">Loading chat room...</span>
        </div>
      </div>
    )
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-4">Wallet Required</h2>
            <p className="text-gray-400 mb-6">
              Please connect your wallet to access this chat room.
            </p>
            <Button 
              onClick={() => router.push('/')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex h-screen">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-gray-900 border-b border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{displayChatRoom.title}</h1>
                  <p className="text-sm text-gray-400">
                    {displayChatRoom.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-purple-900 text-purple-200">
                  <Key className="h-3 w-3 mr-1" />
                  {displayChatRoom.minKeysRequired} keys required
                </Badge>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  <Users className="h-3 w-3 mr-1" />
                  {displayChatRoom.participantCount} members
                </Badge>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-xs lg:max-w-md ${msg.isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback className="bg-gray-700 text-gray-300 text-xs">
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`${msg.isOwn ? 'mr-2' : 'ml-2'}`}>
                      <div className={`rounded-lg px-3 py-2 ${
                        msg.isOwn 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-800 text-gray-100'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <div className={`flex items-center mt-1 text-xs text-gray-500 ${
                        msg.isOwn ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{msg.senderName}</span>
                        <span className="mx-1">•</span>
                        <span>{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="bg-gray-900 border-t border-gray-800 p-4">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Participants Sidebar */}
        <div className="w-80 bg-gray-900 border-l border-gray-800">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Participants</h3>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-3">
                {displayParticipants.map((participant) => (
                  <div
                    key={participant.address}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="bg-gray-700 text-gray-300">
                            {getInitials(participant.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
                          participant.isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{participant.name}</p>
                        <p className="text-xs text-gray-400">
                          {participant.address.slice(0, 4)}...{participant.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-purple-900 text-purple-200 text-xs">
                      {participant.keyBalance} keys
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
```