```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Heart, MessageCircle, Share2, TrendingUp, Users, Zap } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'

interface Post {
  id: string
  author: {
    address: string
    username: string
    avatar?: string
    keyPrice: number
    keyHolders: number
  }
  content: string
  timestamp: Date
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  keyRequired: boolean
  priceToView?: number
}

interface User {
  address: string
  username: string
  avatar?: string
  keyPrice: number
  keyHolders: number
  totalValue: number
  isFollowing: boolean
}

export default function SocialFeed() {
  const { publicKey, connected } = useWallet()
  const [posts, setPosts] = useState<Post[]>([])
  const [trendingUsers, setTrendingUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'feed' | 'trending'>('feed')

  useEffect(() => {
    // Mock data for demonstration
    const mockPosts: Post[] = [
      {
        id: '1',
        author: {
          address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          username: 'cryptowhale',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cryptowhale',
          keyPrice: 0.05,
          keyHolders: 234
        },
        content: 'Just launched my new DeFi strategy! 🚀 Key holders get exclusive access to my trading signals and portfolio updates. The bonding curve is looking bullish! 📈',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        likes: 89,
        comments: 23,
        shares: 12,
        isLiked: false,
        keyRequired: false
      },
      {
        id: '2',
        author: {
          address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
          username: 'nftartist',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nftartist',
          keyPrice: 0.12,
          keyHolders: 156
        },
        content: '🔒 Exclusive content for key holders: Behind the scenes of my latest NFT collection. The creative process, inspiration, and upcoming drops!',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        likes: 156,
        comments: 34,
        shares: 28,
        isLiked: true,
        keyRequired: true,
        priceToView: 0.12
      },
      {
        id: '3',
        author: {
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          username: 'solanadev',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=solanadev',
          keyPrice: 0.08,
          keyHolders: 89
        },
        content: 'Building the future of social media on Solana! 💜 This platform proves that decentralized social networks can scale. Who else is excited about the potential?',
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        likes: 203,
        comments: 67,
        shares: 45,
        isLiked: false,
        keyRequired: false
      }
    ]

    const mockTrendingUsers: User[] = [
      {
        address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        username: 'cryptowhale',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cryptowhale',
        keyPrice: 0.05,
        keyHolders: 234,
        totalValue: 11.7,
        isFollowing: false
      },
      {
        address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        username: 'nftartist',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nftartist',
        keyPrice: 0.12,
        keyHolders: 156,
        totalValue: 18.72,
        isFollowing: true
      },
      {
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        username: 'solanadev',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=solanadev',
        keyPrice: 0.08,
        keyHolders: 89,
        totalValue: 7.12,
        isFollowing: false
      }
    ]

    setPosts(mockPosts)
    setTrendingUsers(mockTrendingUsers)
    setLoading(false)
  }, [])

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1
          }
        : post
    ))
  }

  const handleBuyKey = (userAddress: string) => {
    console.log('Buying key for user:', userAddress)
    // Implementation would connect to Solana program
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            SolSocial
          </h1>
          <p className="text-gray-400">Decentralized social media with tokenized interactions</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-900 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'feed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('feed')}
            className={`${activeTab === 'feed' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-800'}`}
          >
            <Zap className="w-4 h-4 mr-2" />
            Feed
          </Button>
          <Button
            variant={activeTab === 'trending' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('trending')}
            className={`${activeTab === 'trending' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-800'}`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'feed' && (
              <div className="space-y-6">
                {posts.map((post) => (
                  <Card key={post.id} className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={post.author.avatar} />
                            <AvatarFallback className="bg-purple-600">
                              {post.author.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-white">@{post.author.username}</h3>
                              {post.keyRequired && (
                                <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Key Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{formatAddress(post.author.address)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-purple-400">{post.author.keyPrice} SOL</p>
                          <p className="text-xs text-gray-400">{post.author.keyHolders} holders</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        {post.keyRequired && !connected ? (
                          <div className="bg-gray-800 border border-purple-600/30 rounded-lg p-4 text-center">
                            <Zap className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                            <p className="text-gray-300 mb-2">This content requires a key to view</p>
                            <p className="text-sm text-gray-400 mb-3">Price: {post.priceToView} SOL</p>
                            <Button 
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => handleBuyKey(post.author.address)}
                            >
                              Buy Key to View
                            </Button>
                          </div>
                        ) : (
                          <p className="text-gray-200 leading-relaxed">{post.content}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{formatTimeAgo(post.timestamp)}</span>
                        <div className="flex items-center space-x-6">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center space-x-1 hover:text-red-400 transition-colors ${
                              post.isLiked ? 'text-red-400' : ''
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-blue-400 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments}</span>
                          </button>
                          <button className="flex items-center space-x-1 hover:text-green-400 transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span>{post.shares}</span>
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'trending' && (
              <div className="space-y-4">
                {trendingUsers.map((user, index) => (
                  <Card key={user.address} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="text-purple-400 border-purple-600">
                              #{index + 1}
                            </Badge>
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-purple-600">
                                {user.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">@{user.username}</h3>
                            <p className="text-sm text-gray-400">{formatAddress(user.address)}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-purple-400 font-medium">{user.keyPrice} SOL</span>
                              <span className="text-sm text-gray-400 flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {user.keyHolders}
                              </span>