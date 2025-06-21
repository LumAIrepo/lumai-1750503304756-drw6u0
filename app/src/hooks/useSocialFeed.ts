```typescript
import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useProgram } from '../contexts/ProgramContext'
import { Post, PostInteraction } from '../types'

interface SocialFeedState {
  posts: Post[]
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
}

interface UseSocialFeedReturn {
  posts: Post[]
  loading: boolean
  error: string | null
  hasMore: boolean
  refreshFeed: () => Promise<void>
  loadMore: () => Promise<void>
  createPost: (content: string, imageUrl?: string) => Promise<void>
  likePost: (postId: string) => Promise<void>
  sharePost: (postId: string) => Promise<void>
  commentOnPost: (postId: string, content: string) => Promise<void>
}

export const useSocialFeed = (userAddress?: string): UseSocialFeedReturn => {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { program } = useProgram()

  const [state, setState] = useState<SocialFeedState>({
    posts: [],
    loading: false,
    error: null,
    hasMore: true,
    page: 0
  })

  const fetchPosts = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (!program || !connection) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const limit = 20
      const offset = page * limit

      // Fetch posts from the program
      const postAccounts = await program.account.post.all([
        {
          memcmp: userAddress ? {
            offset: 8, // Skip discriminator
            bytes: userAddress
          } : undefined
        }
      ])

      // Sort by timestamp (newest first)
      const sortedPosts = postAccounts
        .sort((a, b) => b.account.timestamp.toNumber() - a.account.timestamp.toNumber())
        .slice(offset, offset + limit)

      // Transform to Post type
      const posts: Post[] = await Promise.all(
        sortedPosts.map(async (postAccount) => {
          const post = postAccount.account
          
          // Fetch user profile for each post
          const userProfile = await program.account.user.fetchNullable(post.author)
          
          // Fetch interactions count
          const interactions = await program.account.postInteraction.all([
            {
              memcmp: {
                offset: 8,
                bytes: postAccount.publicKey.toBase58()
              }
            }
          ])

          const likes = interactions.filter(i => i.account.interactionType.like).length
          const shares = interactions.filter(i => i.account.interactionType.share).length
          const comments = interactions.filter(i => i.account.interactionType.comment).length

          // Check if current user has interacted
          const userInteraction = publicKey ? interactions.find(
            i => i.account.user.equals(publicKey)
          ) : null

          return {
            id: postAccount.publicKey.toBase58(),
            author: post.author.toBase58(),
            authorName: userProfile?.username || 'Unknown User',
            authorAvatar: userProfile?.profileImageUrl || '',
            content: post.content,
            imageUrl: post.imageUrl || undefined,
            timestamp: new Date(post.timestamp.toNumber() * 1000),
            likes,
            shares,
            comments,
            isLiked: userInteraction?.account.interactionType.like || false,
            isShared: userInteraction?.account.interactionType.share || false,
            keyPrice: post.keyPrice?.toNumber() || 0,
            isKeyRequired: post.keyRequired || false
          }
        })
      )

      setState(prev => ({
        ...prev,
        posts: reset ? posts : [...prev.posts, ...posts],
        loading: false,
        hasMore: posts.length === limit,
        page: reset ? 0 : page
      }))

    } catch (error) {
      console.error('Error fetching posts:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts'
      }))
    }
  }, [program, connection, userAddress, publicKey])

  const refreshFeed = useCallback(async () => {
    await fetchPosts(0, true)
  }, [fetchPosts])

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return
    await fetchPosts(state.page + 1, false)
  }, [fetchPosts, state.loading, state.hasMore, state.page])

  const createPost = useCallback(async (content: string, imageUrl?: string) => {
    if (!program || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const postKeypair = new PublicKey(Math.random().toString())
      
      const tx = await program.methods
        .createPost(content, imageUrl || null, false, null)
        .accounts({
          post: postKeypair,
          author: publicKey,
          systemProgram: new PublicKey('11111111111111111111111111111111')
        })
        .transaction()

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Refresh feed to show new post
      await refreshFeed()

    } catch (error) {
      console.error('Error creating post:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      }))
      throw error
    }
  }, [program, publicKey, signTransaction, connection, refreshFeed])

  const likePost = useCallback(async (postId: string) => {
    if (!program || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    try {
      const postPubkey = new PublicKey(postId)
      const interactionKeypair = new PublicKey(Math.random().toString())

      const tx = await program.methods
        .interactPost({ like: {} })
        .accounts({
          postInteraction: interactionKeypair,
          post: postPubkey,
          user: publicKey,
          systemProgram: new PublicKey('11111111111111111111111111111111')
        })
        .transaction()

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Update local state optimistically
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.id === postId 
            ? { ...post, likes: post.likes + (post.isLiked ? -1 : 1), isLiked: !post.isLiked }
            : post
        )
      }))

    } catch (error) {
      console.error('Error liking post:', error)
      throw error
    }
  }, [program, publicKey, signTransaction, connection])

  const sharePost = useCallback(async (postId: string) => {
    if (!program || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    try {
      const postPubkey = new PublicKey(postId)
      const interactionKeypair = new PublicKey(Math.random().toString())

      const tx = await program.methods
        .interactPost({ share: {} })
        .accounts({
          postInteraction: interactionKeypair,
          post: postPubkey,
          user: publicKey,
          systemProgram: new PublicKey('11111111111111111111111111111111')
        })
        .transaction()

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Update local state optimistically
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.id === postId 
            ? { ...post, shares: post.shares + (post.isShared ? -1 : 1), isShared: !post.isShared }
            : post
        )
      }))

    } catch (error) {
      console.error('Error sharing post:', error)
      throw error
    }
  }, [program, publicKey, signTransaction, connection])

  const commentOnPost = useCallback(async (postId: string, content: string) => {
    if (!program || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    try {
      const postPubkey = new PublicKey(postId)
      const interactionKeypair = new PublicKey(Math.random().toString())

      const tx = await program.methods
        .interactPost({ comment: { content } })
        .accounts({
          postInteraction: interactionKeypair,
          post: postPubkey,
          user: publicKey,
          systemProgram: new PublicKey('11111111111111111111111111111111')
        })
        .transaction()

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Update local state optimistically
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.id === postId 
            ? { ...post, comments: post.comments + 1 }
            : post
        )
      }))

    } catch (error) {
      console.error('Error commenting on post:', error)
      throw error
    }
  }, [program, publicKey, signTransaction, connection])

  // Initial load
  useEffect(() => {
    if (program && connection) {
      fetchPosts(0, true)
    }
  }, [program, connection, userAddress])

  return {
    posts: state.posts,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    refreshFeed,
    loadMore,
    createPost,
    likePost,
    sharePost,
    commentOnPost
  }
}

export default useSocialFeed
```