```tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TrendingUp, TrendingDown, Users, DollarSign, Activity } from 'lucide-react'
import { BondingCurveChart } from './BondingCurveChart'

interface UserKey {
  address: string
  username: string
  avatar?: string
  keyPrice: number
  totalSupply: number
  holdersCount: number
  volume24h: number
  priceChange24h: number
  marketCap: number
}

interface KeyHolding {
  userAddress: string
  username: string
  avatar?: string
  keysOwned: number
  totalValue: number
  unrealizedPnl: number
  avgBuyPrice: number
}

export default function KeyTrading() {
  const { publicKey, connected } = useWallet()
  const [activeTab, setActiveTab] = useState('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellAmount, setSellAmount] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserKey | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mock data - replace with actual program calls
  const [trendingKeys] = useState<UserKey[]>([
    {
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      username: 'cryptodev',
      avatar: '/api/placeholder/40/40',
      keyPrice: 0.0234,
      totalSupply: 156,
      holdersCount: 89,
      volume24h: 12.45,
      priceChange24h: 15.6,
      marketCap: 3.65
    },
    {
      address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      username: 'solana_queen',
      avatar: '/api/placeholder/40/40',
      keyPrice: 0.0189,
      totalSupply: 203,
      holdersCount: 124,
      volume24h: 8.92,
      priceChange24h: -3.2,
      marketCap: 3.84
    },
    {
      address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
      username: 'defi_master',
      avatar: '/api/placeholder/40/40',
      keyPrice: 0.0456,
      totalSupply: 78,
      holdersCount: 45,
      volume24h: 15.67,
      priceChange24h: 28.4,
      marketCap: 3.56
    }
  ])

  const [myHoldings] = useState<KeyHolding[]>([
    {
      userAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      username: 'cryptodev',
      avatar: '/api/placeholder/40/40',
      keysOwned: 5,
      totalValue: 0.117,
      unrealizedPnl: 0.023,
      avgBuyPrice: 0.0188
    },
    {
      userAddress: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
      username: 'defi_master',
      avatar: '/api/placeholder/40/40',
      keysOwned: 2,
      totalValue: 0.0912,
      unrealizedPnl: 0.0156,
      avgBuyPrice: 0.0378
    }
  ])

  const calculateBuyPrice = (amount: number, currentPrice: number, supply: number): number => {
    // Simplified bonding curve calculation
    const basePrice = currentPrice
    const priceIncrease = (amount * 0.001) * (supply / 100)
    return basePrice + priceIncrease
  }

  const calculateSellPrice = (amount: number, currentPrice: number, supply: number): number => {
    // Simplified bonding curve calculation
    const basePrice = currentPrice
    const priceDecrease = (amount * 0.001) * (supply / 100)
    return Math.max(0.001, basePrice - priceDecrease)
  }

  const handleBuyKeys = async () => {
    if (!connected || !selectedUser || !buyAmount) return
    
    setIsLoading(true)
    try {
      // TODO: Implement actual program call
      console.log(`Buying ${buyAmount} keys of ${selectedUser.username}`)
      // await program.methods.buyKeys(new BN(parseFloat(buyAmount) * 1000000))...
    } catch (error) {
      console.error('Error buying keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSellKeys = async () => {
    if (!connected || !selectedUser || !sellAmount) return
    
    setIsLoading(true)
    try {
      // TODO: Implement actual program call
      console.log(`Selling ${sellAmount} keys of ${selectedUser.username}`)
      // await program.methods.sellKeys(new BN(parseFloat(sellAmount) * 1000000))...
    } catch (error) {
      console.error('Error selling keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredKeys = trendingKeys.filter(key =>
    key.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatPrice = (price: number) => `◎${price.toFixed(4)}`
  const formatPercent = (percent: number) => `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Key Trading</h1>
          <p className="text-gray-400">Trade social keys and unlock exclusive access</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Key List */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Discover Keys</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                    <TabsTrigger value="trending" className="data-[state=active]:bg-blue-600">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Trending
                    </TabsTrigger>
                    <TabsTrigger value="holdings" className="data-[state=active]:bg-blue-600">
                      <Users className="w-4 h-4 mr-2" />
                      My Holdings
                    </TabsTrigger>
                    <TabsTrigger value="watchlist" className="data-[state=active]:bg-blue-600">
                      <Activity className="w-4 h-4 mr-2" />
                      Watchlist
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="trending" className="mt-4">
                    <div className="space-y-3">
                      {filteredKeys.map((key) => (
                        <div
                          key={key.address}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedUser?.address === key.address
                              ? 'bg-blue-900/20 border-blue-600'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                          }`}
                          onClick={() => setSelectedUser(key)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={key.avatar} />
                                <AvatarFallback>{key.username[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold">{key.username}</div>
                                <div className="text-sm text-gray-400">
                                  {key.address.slice(0, 8)}...{key.address.slice(-4)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatPrice(key.keyPrice)}</div>
                              <div className={`text-sm flex items-center ${
                                key.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {key.priceChange24h >= 0 ? (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                )}
                                {formatPercent(key.priceChange24h)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
                            <div className="flex space-x-4">
                              <span>Supply: {key.totalSupply}</span>
                              <span>Holders: {key.holdersCount}</span>
                            </div>
                            <div className="flex space-x-4">
                              <span>Vol: {formatPrice(key.volume24h)}</span>
                              <span>MCap: {formatPrice(key.marketCap)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="holdings" className="mt-4">
                    <div className="space-y-3">
                      {myHoldings.map((holding) => (
                        <div
                          key={holding.userAddress}
                          className="p-4 rounded-lg bg-gray-800 border border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={holding.avatar} />
                                <AvatarFallback>{holding.username[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold">{holding.username}</div>
                                <div className="text-sm text-gray-400">
                                  {holding.keysOwned} keys owned
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatPrice(holding.totalValue)}</div>
                              <div className={`text-sm ${
                                holding.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {holding.unrealizedPnl >= 0 ? '+' : ''}{formatPrice(holding.unrealizedPnl)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-400">
                            Avg Buy Price: {formatPrice(holding.avgBuyPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="watchlist" className="mt-4">
                    <div className="text-center py-8 text-gray-400">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No keys in watchlist yet</p>
                      <p className="text-sm">Add keys to track their performance</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Trading Interface */}
          <div className="space-y-6">
            {selectedUser ? (
              <>
                {/* Selected User Info */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={selectedUser.avatar} />
                        <AvatarFallback>{selectedUser.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold">{selectedUser.username}</h3>
                        <p className="text-gray-400 text-sm">
                          {selectedUser.address.slice(0, 12)}...{selectedUser.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-800 rounded-lg">
                        <div className="text-2xl font-bold">{formatPrice(selectedUser.keyPrice)}</div>
                        <div className="text-sm text-gray-400">Current Price</div>
                      </div>
                      <div className="text-center p-3 bg-gray-800 rounded-lg">
                        <div className={`text-