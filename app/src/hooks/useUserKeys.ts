```typescript
import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useProgram } from '../contexts/ProgramContext'
import { UserKeys, KeyHolder } from '../types'

interface UseUserKeysReturn {
  userKeys: UserKeys | null
  keyHolders: KeyHolder[]
  keyPrice: number
  totalSupply: number
  loading: boolean
  error: string | null
  createKeys: (username: string, bio: string) => Promise<boolean>
  buyKeys: (targetUser: PublicKey, amount: number) => Promise<boolean>
  sellKeys: (targetUser: PublicKey, amount: number) => Promise<boolean>
  refreshKeys: () => Promise<void>
}

export const useUserKeys = (userAddress?: PublicKey): UseUserKeysReturn => {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { program } = useProgram()
  
  const [userKeys, setUserKeys] = useState<UserKeys | null>(null)
  const [keyHolders, setKeyHolders] = useState<KeyHolder[]>([])
  const [keyPrice, setKeyPrice] = useState<number>(0)
  const [totalSupply, setTotalSupply] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const targetAddress = userAddress || publicKey

  const calculateKeyPrice = useCallback((supply: number, amount: number): number => {
    if (supply === 0) return 0.001 * LAMPORTS_PER_SOL // Base price
    
    // Bonding curve: price = (supply^2) * 0.0001 + 0.001
    const basePrice = 0.001
    const curveMultiplier = 0.0001
    
    let totalCost = 0
    for (let i = 0; i < amount; i++) {
      const currentSupply = supply + i
      const price = (Math.pow(currentSupply, 2) * curveMultiplier + basePrice) * LAMPORTS_PER_SOL
      totalCost += price
    }
    
    return totalCost
  }, [])

  const fetchUserKeys = useCallback(async () => {
    if (!program || !targetAddress) return

    try {
      setLoading(true)
      setError(null)

      const [keysAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('keys'), targetAddress.toBuffer()],
        program.programId
      )

      const keysData = await program.account.userKeys.fetchNullable(keysAccount)
      
      if (keysData) {
        const keys: UserKeys = {
          address: keysAccount,
          creator: keysData.creator,
          totalSupply: keysData.totalSupply,
          createdAt: keysData.createdAt.toNumber(),
          holders: keysData.holders || []
        }
        
        setUserKeys(keys)
        setTotalSupply(keysData.totalSupply)
        
        // Calculate current price for buying 1 key
        const price = calculateKeyPrice(keysData.totalSupply, 1)
        setKeyPrice(price)

        // Fetch key holders details
        const holdersData: KeyHolder[] = []
        for (const holder of keysData.holders) {
          try {
            const [userAccount] = PublicKey.findProgramAddressSync(
              [Buffer.from('user'), holder.holder.toBuffer()],
              program.programId
            )
            
            const userData = await program.account.user.fetchNullable(userAccount)
            if (userData) {
              holdersData.push({
                address: holder.holder,
                username: userData.username,
                avatar: userData.avatar || '',
                keysOwned: holder.amount,
                totalValue: holder.amount * (keyPrice / LAMPORTS_PER_SOL)
              })
            }
          } catch (err) {
            console.warn('Failed to fetch holder data:', err)
          }
        }
        
        setKeyHolders(holdersData)
      } else {
        setUserKeys(null)
        setKeyHolders([])
        setKeyPrice(0.001 * LAMPORTS_PER_SOL)
        setTotalSupply(0)
      }
    } catch (err) {
      console.error('Error fetching user keys:', err)
      setError('Failed to fetch user keys')
    } finally {
      setLoading(false)
    }
  }, [program, targetAddress, calculateKeyPrice, keyPrice])

  const createKeys = useCallback(async (username: string, bio: string): Promise<boolean> => {
    if (!program || !publicKey || !signTransaction) {
      setError('Wallet not connected')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), publicKey.toBuffer()],
        program.programId
      )

      const [keysAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('keys'), publicKey.toBuffer()],
        program.programId
      )

      const transaction = new Transaction()

      // Check if user account exists, create if not
      const userData = await program.account.user.fetchNullable(userAccount)
      if (!userData) {
        const initUserIx = await program.methods
          .initializeUser(username, bio, '')
          .accounts({
            user: userAccount,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .instruction()
        
        transaction.add(initUserIx)
      }

      // Create keys
      const createKeysIx = await program.methods
        .createKeys()
        .accounts({
          keys: keysAccount,
          creator: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction()

      transaction.add(createKeysIx)

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTx = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')
      
      await fetchUserKeys()
      return true
    } catch (err) {
      console.error('Error creating keys:', err)
      setError('Failed to create keys')
      return false
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, signTransaction, connection, fetchUserKeys])

  const buyKeys = useCallback(async (targetUser: PublicKey, amount: number): Promise<boolean> => {
    if (!program || !publicKey || !signTransaction) {
      setError('Wallet not connected')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const [keysAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('keys'), targetUser.toBuffer()],
        program.programId
      )

      const [buyerAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), publicKey.toBuffer()],
        program.programId
      )

      const keysData = await program.account.userKeys.fetch(keysAccount)
      const totalCost = calculateKeyPrice(keysData.totalSupply, amount)

      const transaction = new Transaction()
      
      const buyKeysIx = await program.methods
        .buyKeys(amount)
        .accounts({
          keys: keysAccount,
          buyer: buyerAccount,
          buyerAuthority: publicKey,
          creator: targetUser,
          systemProgram: SystemProgram.programId,
        })
        .instruction()

      transaction.add(buyKeysIx)

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTx = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')
      
      await fetchUserKeys()
      return true
    } catch (err) {
      console.error('Error buying keys:', err)
      setError('Failed to buy keys')
      return false
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, signTransaction, connection, calculateKeyPrice, fetchUserKeys])

  const sellKeys = useCallback(async (targetUser: PublicKey, amount: number): Promise<boolean> => {
    if (!program || !publicKey || !signTransaction) {
      setError('Wallet not connected')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const [keysAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('keys'), targetUser.toBuffer()],
        program.programId
      )

      const [sellerAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), publicKey.toBuffer()],
        program.programId
      )

      const transaction = new Transaction()
      
      const sellKeysIx = await program.methods
        .sellKeys(amount)
        .accounts({
          keys: keysAccount,
          seller: sellerAccount,
          sellerAuthority: publicKey,
          creator: targetUser,
          systemProgram: SystemProgram.programId,
        })
        .instruction()

      transaction.add(sellKeysIx)

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTx = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      await connection.confirmTransaction(signature, 'confirmed')
      
      await fetchUserKeys()
      return true
    } catch (err) {
      console.error('Error selling keys:', err)
      setError('Failed to sell keys')
      return false
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, signTransaction, connection, fetchUserKeys])

  const refreshKeys = useCallback(async () => {
    await fetchUserKeys()
  }, [fetchUserKeys])

  useEffect(() => {
    if (targetAddress) {
      fetchUserKeys()
    }
  }, [fetchUserKeys, targetAddress])

  return {
    userKeys,
    keyHolders,
    keyPrice,
    totalSupply,
    loading,
    error,
    createKeys,
    buyKeys,
    sellKeys,
    refreshKeys
  }
}
```