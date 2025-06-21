```tsx
'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Heart, 
  Share2, 
  Calendar,
  MapPin,
  Link as LinkIcon,
  Settings,
  Copy,
  Check
} from 'lucide-react'
import { useProgramContext } from '@/contexts/ProgramContext'
import { useUserKeys } from '@/hooks/useUserKeys'
import { useSocialFeed } from '@/hooks/useSocialFeed'
import { formatNumber, formatPrice } from '@/utils/format'

interface UserProfileProps {
  userAddress: string
  isOwnProfile?: boolean
}

interface UserData {
  address: string
  username: string
  displayName: string
  bio: string
  avatar: string
  banner: string
  website: string
  location: string
  joinedAt: Date
  verified: boolean
  followerCount: number
  followingCount: number
  postCount: number
  keyHolders: number
  totalVolume: number
  currentKeyPrice: number
}

interface Post {
  id: string
  content: string
  timestamp: Date
  likes: number
  comments: number
  shares: number
  isLiked: boolean
}

export default function UserProfile({ userAddress, isOwnProfile = false }: UserProfileProps) {
  const { publicKey } = useWallet()
  const { program } = useProgramContext()
  const { keyPrice, keyBalance, buyKeys, sellKeys } = useUserKeys(userAddress)
  const { posts, loading: postsLoading } = useSocialFeed(userAddress)
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [copied, setCopied] = useState(false)
  const [keyAmount, setKeyAmount] = useState(1)

  useEffect(() => {
    loadUserData()
  }, [userAddress, program])

  const loadUserData = async () => {
    if (!program) return

    try {
      setLoading(true)
      
      // Mock data for demo - replace with actual program calls
      const mockUserData: UserData = {
        address: userAddress,
        username: `user_${userAddress.slice(0, 8)}`,
        displayName: 'Solana Creator',
        bio: 'Building the future of decentralized social media on Solana. Creator, developer, and key holder.',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userAddress}`,
        banner: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&h=200&fit=crop',
        website: 'https://solsocial.app',
        location: 'Solana Beach',
        joinedAt: new Date('2024-01-15'),
        verified: Math.random() > 0.5,
        followerCount: Math.floor(Math.random() * 10000) + 100,
        followingCount: Math.floor(Math.random() * 1000) + 50,
        postCount: Math.floor(Math.random() * 500) + 10,
        keyHolders: Math.floor(Math.random() * 100) + 5,
        totalVolume: Math.random() * 1000 + 50,
        currentKeyPrice: keyPrice || Math.random() * 10 + 0.1
      }

      setUserData(mockUserData)
      setFollowing(Math.random() > 0.5)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(userAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBuyKeys = async () => {
    try {
      await buyKeys(keyAmount)
    } catch (error) {
      console.error('Error buying keys:', error)
    }
  }

  const handleSellKeys = async () => {
    try {
      await sellKeys(keyAmount)
    } catch (error) {
      console.error('Error selling keys:', error)
    }
  }

  const handleFollow = async () => {
    // Implement follow/unfollow logic
    setFollowing(!following)
  }

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-gray-950 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-800 rounded-lg mb-4"></div>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-24 h-24 bg-gray-800 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-800 rounded w-1/3"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                <div className="h-4 bg-gray-800 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-r from-purple-600 to-blue-600">
        <img 
          src={userData.banner} 
          alt="Profile banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-10">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
          <Avatar className="w-24 h-24 border-4 border-gray-950">
            <AvatarImage src={userData.avatar} alt={userData.displayName} />
            <AvatarFallback>{userData.displayName.slice(0, 2)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{userData.displayName}</h1>
              {userData.verified && (
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  Verified
                </Badge>
              )}
            </div>
            
            <p className="text-gray-400 mb-1">@{userData.username}</p>
            
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <button 
                onClick={handleCopyAddress}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {userAddress.slice(0, 8)}...{userAddress.slice(-8)}
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <p className="text-gray-300 mb-4">{userData.bio}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
              {userData.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {userData.location}
                </div>
              )}
              {userData.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  <a href={userData.website} target="_blank" rel="noopener noreferrer" 
                     className="hover:text-white transition-colors">
                    {userData.website.replace('https://', '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {userData.joinedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            <div className="flex gap-6 text-sm mb-4">
              <div>
                <span className="font-semibold text-white">{formatNumber(userData.followingCount)}</span>
                <span className="text-gray-400 ml-1">Following</span>
              </div>
              <div>
                <span className="font-semibold text-white">{formatNumber(userData.followerCount)}</span>
                <span className="text-gray-400 ml-1">Followers</span>
              </div>
              <div>
                <span className="font-semibold text-white">{formatNumber(userData.keyHolders)}</span>
                <span className="text-gray-400 ml-1">Key Holders</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!isOwnProfile && publicKey && (
              <>
                <Button 
                  onClick={handleFollow}
                  variant={following ? "outline" : "default"}
                  className="min-w-[120px]"
                >
                  {following ? 'Unfollow' : 'Follow'}
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </>
            )}
            {isOwnProfile && (
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Key Trading Section */}
        {!isOwnProfile && publicKey && (
          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trade Keys
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Current Price</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatPrice(userData.currentKeyPrice)} SOL
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Your Balance</p>
                  <p className="text-xl font-bold">{keyBalance || 0} Keys</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Total Volume</p>
                  <p className="text-xl font-bold">{formatPrice(userData.totalVolume)} SOL</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={keyAmount}
                    onChange={(e) => setKeyAmount(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleBuyKeys} className="bg-green-600 hover:bg-green-700">
                    Buy Keys
                  </Button>
                  <Button 
                    onClick={handleSellKeys} 
                    variant="outline"
                    disabled={!keyBalance || keyBalance < keyAmount}
                  >
                    Sell Keys
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{formatNumber(userData.postCount)}</div>
              <div className="text-sm text-gray-400">Posts</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{formatNumber(userData.keyHolders)}</div>
              <div className="text-sm text-gray-400">Key Holders</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{formatPrice(userData.totalVolume)}</div>
              <div className="text-sm text-gray-400">Volume (SOL)</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{formatPrice(userData.currentKeyPrice)}</div>
              <div className="text-sm text-gray-400">Key Price (SOL)</div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="holders">Key Holders</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            {postsLoading ? (