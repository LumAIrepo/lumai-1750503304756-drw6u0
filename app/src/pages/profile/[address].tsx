```tsx
'use client'

import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { 
  MessageCircle, 
  Users, 
  TrendingUp, 
  Share2, 
  Heart, 
  DollarSign,
  Copy,
  ExternalLink,
  Settings,
  Shield,
  Star
} from 'lucide-react'
import { BondingCurveChart } from '@/components/BondingCurveChart'
import { KeyTrading } from '@/components/KeyTrading'
import { useUserKeys } from '@/hooks/useUserKeys'
import { useSocialFeed } from '@/hooks/useSocialFeed'
import { useProgram } from '@/contexts/ProgramContext'

interface UserProfile {
  address: string
  username: string
  displayName: string
  bio: string
  avatar: string
  banner: string
  followers: number
  following: number
  totalKeys: number
  keyPrice: number
  totalVolume: number
  posts: number
  joined: string
  verified: boolean
  isCreator: boolean
}

interface Post {
  id: string
  author: string
  content: string
  timestamp: string
  likes: number
  comments: number
  shares: number
  liked: boolean
  keyHoldersOnly: boolean
}

interface KeyHolder {
  address: string
  username: string
  avatar: string
  keysOwned: number
  totalSpent: number
  joinedDate: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { address } = router.query
  const { publicKey, connected } = useWallet()
  const { program } = useProgram()
  const { toast } = useToast()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [keyHolders, setKeyHolders] = useState<KeyHolder[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [newPost, setNewPost] = useState('')
  const [keyHoldersOnly, setKeyHoldersOnly] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [userKeysOwned, setUserKeysOwned] = useState(0)

  const { keyData, buyKey, sellKey, loading: keyLoading } = useUserKeys(address as string)
  const { posts: feedPosts, createPost, likePost, loading: feedLoading } = useSocialFeed()

  useEffect(() => {
    if (address && typeof address === 'string') {
      loadProfile(address)
      loadPosts(address)
      loadKeyHolders(address)
    }
  }, [address])

  useEffect(() => {
    if (publicKey && profile) {
      setIsOwner(publicKey.toString() === profile.address)
      checkUserKeys()
    }
  }, [publicKey, profile])

  const loadProfile = async (userAddress: string) => {
    try {
      // Mock profile data - in real app, fetch from Solana program
      const mockProfile: UserProfile = {
        address: userAddress,
        username: `user_${userAddress.slice(0, 8)}`,
        displayName: 'Solana Creator',
        bio: 'Building the future of decentralized social media on Solana. Join my community and trade my keys!',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userAddress}`,
        banner: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=200&fit=crop',
        followers: 1247,
        following: 892,
        totalKeys: 156,
        keyPrice: 0.045,
        totalVolume: 12.8,
        posts: 89,
        joined: '2024-01-15',
        verified: Math.random() > 0.5,
        isCreator: true
      }
      setProfile(mockProfile)
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async (userAddress: string) => {
    try {
      // Mock posts data
      const mockPosts: Post[] = [
        {
          id: '1',
          author: userAddress,
          content: 'Just launched my keys! Excited to build this community together 🚀',
          timestamp: '2024-01-20T10:30:00Z',
          likes: 24,
          comments: 8,
          shares: 3,
          liked: false,
          keyHoldersOnly: false
        },
        {
          id: '2',
          author: userAddress,
          content: 'Exclusive alpha for my key holders: Working on a new DeFi protocol that will change everything. More details in our private chat!',
          timestamp: '2024-01-19T15:45:00Z',
          likes: 67,
          comments: 23,
          shares: 12,
          liked: true,
          keyHoldersOnly: true
        },
        {
          id: '3',
          author: userAddress,
          content: 'GM everyone! The Solana ecosystem is absolutely thriving. What are your favorite projects right now?',
          timestamp: '2024-01-18T08:15:00Z',
          likes: 156,
          comments: 45,
          shares: 28,
          liked: false,
          keyHoldersOnly: false
        }
      ]
      setPosts(mockPosts)
    } catch (error) {
      console.error('Error loading posts:', error)
    }
  }

  const loadKeyHolders = async (userAddress: string) => {
    try {
      // Mock key holders data
      const mockKeyHolders: KeyHolder[] = [
        {
          address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          username: 'whale_trader',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=whale',
          keysOwned: 25,
          totalSpent: 1.2,
          joinedDate: '2024-01-16'
        },
        {
          address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
          username: 'solana_degen',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=degen',
          keysOwned: 18,
          totalSpent: 0.8,
          joinedDate: '2024-01-17'
        },
        {
          address: '8HNdBLNPhW2AvsB9BF6sQ2K7p1DiGzWtRNzDvTzTkSrJ',
          username: 'crypto_enthusiast',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=enthusiast',
          keysOwned: 12,
          totalSpent: 0.5,
          joinedDate: '2024-01-18'
        }
      ]
      setKeyHolders(mockKeyHolders)
    } catch (error) {
      console.error('Error loading key holders:', error)
    }
  }

  const checkUserKeys = async () => {
    if (!publicKey || !profile) return
    
    try {
      // Check how many keys the current user owns of this profile
      setUserKeysOwned(5) // Mock data
    } catch (error) {
      console.error('Error checking user keys:', error)
    }
  }

  const handleCreatePost = async () => {
    if (!newPost.trim() || !connected) return

    try {
      await createPost(newPost, keyHoldersOnly)
      setNewPost('')
      setKeyHoldersOnly(false)
      toast({
        title: 'Success',
        description: 'Post created successfully!'
      })
      // Reload posts
      if (address && typeof address === 'string') {
        loadPosts(address)
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive'
      })
    }
  }

  const handleLikePost = async (postId: string) => {
    try {
      await likePost(postId)
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
          : post
      ))
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const copyAddress = () => {
    if (profile) {
      navigator.clipboard.writeText(profile.address)
      toast({
        title: 'Copied!',
        description: 'Address copied to clipboard'
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const postTime = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
            <p className="text-gray-400">The requested profile could not be found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-r from-purple-600 to-blue-600">
        <img 
          src={profile.banner} 
          alt="Profile banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      {/* Profile Header */}
      <div className="relative px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 -mt-16">
          <Avatar className="w-32 h-32 border-4 border-gray-900">
            <AvatarImage src={profile.avatar} alt={profile.displayName} />
            <AvatarFallback className="text-2xl bg-purple-600">
              {profile.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-white">{profile.displayName}</h1>
                  {profile.verified && (
                    <Badge variant="secondary" className="bg-blue-600 text-white">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {profile.isCreator && (
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Creator
                    </Badge>
                  )}
                </div>
                <p className="text-gray-400">@{profile.username}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-400">{profile.address.slice(0, 8)}...{profile.address.slice(-8)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                {!isOwner && connected && (
                  <>
                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      onClick={() => setIsFollowing(!isFollowing)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
                {isOwner && (
                  <Button variant="outline" className="