```tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { 
  ConnectionProvider, 
  WalletProvider as SolanaWalletProvider,
  useConnection,
  useWallet as useSolanaWallet
} from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
  GlowWalletAdapter
} from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { toast } from 'sonner'

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css')

interface WalletContextType {
  connected: boolean
  connecting: boolean
  publicKey: PublicKey | null
  wallet: any
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signTransaction: (transaction: any) => Promise<any>
  signAllTransactions: (transactions: any[]) => Promise<any[]>
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
  balance: number
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

// Network configuration
const network = WalletAdapterNetwork.Devnet
const endpoint = clusterApiUrl(network)

// Wallet adapters
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new BackpackWalletAdapter(),
  new GlowWalletAdapter(),
]

function WalletContextProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection()
  const { 
    publicKey, 
    connected, 
    connecting, 
    wallet, 
    connect: solanaConnect, 
    disconnect: solanaDisconnect,
    signTransaction,
    signAllTransactions,
    signMessage
  } = useSolanaWallet()
  
  const [balance, setBalance] = useState<number>(0)

  const connect = async () => {
    try {
      await solanaConnect()
      toast.success('Wallet connected successfully!')
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      toast.error('Failed to connect wallet')
    }
  }

  const disconnect = async () => {
    try {
      await solanaDisconnect()
      setBalance(0)
      toast.success('Wallet disconnected')
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
      toast.error('Failed to disconnect wallet')
    }
  }

  const refreshBalance = async () => {
    if (!publicKey || !connection) return
    
    try {
      const balance = await connection.getBalance(publicKey)
      setBalance(balance / 1e9) // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  // Fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      refreshBalance()
    }
  }, [connected, publicKey, connection])

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!connected || !publicKey) return

    const interval = setInterval(refreshBalance, 30000)
    return () => clearInterval(interval)
  }, [connected, publicKey])

  const contextValue: WalletContextType = {
    connected,
    connecting,
    publicKey,
    wallet,
    connect,
    disconnect,
    signTransaction: signTransaction!,
    signAllTransactions: signAllTransactions!,
    signMessage: signMessage!,
    balance,
    refreshBalance,
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

// Wallet connection button component
export function WalletButton() {
  const { connected, connecting, connect, disconnect, publicKey, balance } = useWallet()

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-400">
          {balance.toFixed(4)} SOL
        </div>
        <div className="text-sm text-gray-300">
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </div>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}

// Wallet connection guard component
export function WalletGuard({ children }: { children: ReactNode }) {
  const { connected } = useWallet()

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">SolSocial</h1>
            <p className="text-gray-400 text-lg">
              Connect your wallet to access the decentralized social platform
            </p>
          </div>
          <WalletButton />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default WalletProvider
```