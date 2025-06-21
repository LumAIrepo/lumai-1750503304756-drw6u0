```tsx
'use client'

import { useState, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ImageIcon, 
  VideoIcon, 
  FileIcon, 
  X, 
  Globe, 
  Users, 
  Lock,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { useProgram } from '@/contexts/ProgramContext'
import { toast } from 'sonner'

interface MediaFile {
  id: string
  file: File
  type: 'image' | 'video' | 'document'
  preview?: string
}

interface PostCreatorProps {
  onPostCreated?: (postId: string) => void
  className?: string
}

export default function PostCreator({ onPostCreated, className }: PostCreatorProps) {
  const { publicKey, connected } = useWallet()
  const { program, createPost } = useProgram()
  
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'holders' | 'premium'>('public')
  const [requiredKeys, setRequiredKeys] = useState(1)
  const [isTokenGated, setIsTokenGated] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (files: FileList | null, type: 'image' | 'video' | 'document') => {
    if (!files) return

    Array.from(files).forEach(file => {
      const mediaFile: MediaFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type
      }

      if (type === 'image' || type === 'video') {
        const reader = new FileReader()
        reader.onload = (e) => {
          mediaFile.preview = e.target?.result as string
          setMediaFiles(prev => [...prev, mediaFile])
        }
        reader.readAsDataURL(file)
      } else {
        setMediaFiles(prev => [...prev, mediaFile])
      }
    })
  }

  const removeMediaFile = (id: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== id))
  }

  const handleCreatePost = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Please add some content or media')
      return
    }

    setIsPosting(true)

    try {
      // Upload media files to IPFS or similar storage
      const mediaUrls: string[] = []
      for (const mediaFile of mediaFiles) {
        // In production, upload to IPFS/Arweave
        const mockUrl = `https://storage.example.com/${mediaFile.id}`
        mediaUrls.push(mockUrl)
      }

      const postData = {
        content: content.trim(),
        mediaUrls,
        visibility,
        requiredKeys: isTokenGated ? requiredKeys : 0,
        timestamp: Date.now()
      }

      const postId = await createPost(postData)
      
      toast.success('Post created successfully!')
      
      // Reset form
      setContent('')
      setMediaFiles([])
      setVisibility('public')
      setRequiredKeys(1)
      setIsTokenGated(false)
      
      onPostCreated?.(postId)
      
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }

  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4" />
      case 'holders':
        return <Users className="h-4 w-4" />
      case 'premium':
        return <Lock className="h-4 w-4" />
    }
  }

  const getVisibilityLabel = () => {
    switch (visibility) {
      case 'public':
        return 'Public'
      case 'holders':
        return 'Key Holders Only'
      case 'premium':
        return 'Premium Content'
    }
  }

  return (
    <Card className={`bg-gray-900 border-gray-800 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${publicKey?.toString()}`} />
            <AvatarFallback className="bg-purple-600 text-white">
              {publicKey?.toString().slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              Create Post
              <Sparkles className="h-4 w-4 text-purple-400" />
            </CardTitle>
            <p className="text-sm text-gray-400">
              Share your thoughts with the community
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="What's happening in the Solana ecosystem?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] bg-gray-800 border-gray-700 text-white placeholder-gray-400 resize-none focus:ring-purple-500 focus:border-purple-500"
            maxLength={500}
          />
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">
              {content.length}/500 characters
            </span>
            {content.length > 450 && (
              <span className="text-yellow-400">
                {500 - content.length} remaining
              </span>
            )}
          </div>
        </div>

        {/* Media Files */}
        {mediaFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-white">Attached Media</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {mediaFiles.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                    {file.type === 'image' && file.preview && (
                      <img
                        src={file.preview}
                        alt="Preview"
                        className="w-full h-20 object-cover rounded"
                      />
                    )}
                    {file.type === 'video' && file.preview && (
                      <video
                        src={file.preview}
                        className="w-full h-20 object-cover rounded"
                        controls={false}
                      />
                    )}
                    {file.type === 'document' && (
                      <div className="flex items-center space-x-2 h-20">
                        <FileIcon className="h-6 w-6 text-gray-400" />
                        <span className="text-xs text-gray-300 truncate">
                          {file.file.name}
                        </span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMediaFile(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-gray-700" />

        {/* Visibility Settings */}
        <div className="space-y-3">
          <Label className="text-white">Post Visibility</Label>
          <div className="flex flex-wrap gap-2">
            {(['public', 'holders', 'premium'] as const).map((option) => (
              <Button
                key={option}
                variant={visibility === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setVisibility(option)
                  setIsTokenGated(option !== 'public')
                }}
                className={`${
                  visibility === option
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {option === 'public' && <Globe className="h-3 w-3 mr-1" />}
                {option === 'holders' && <Users className="h-3 w-3 mr-1" />}
                {option === 'premium' && <Lock className="h-3 w-3 mr-1" />}
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>

          {isTokenGated && (
            <div className="space-y-2">
              <Label className="text-white">Required Keys to View</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={requiredKeys}
                  onChange={(e) => setRequiredKeys(parseInt(e.target.value) || 1)}
                  className="w-20 bg-gray-800 border-gray-700 text-white"
                />
                <span className="text-gray-400">keys minimum</span>
                <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-gray-700" />

        {/* Media Upload Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => videoInputRef.current?.click()}
            className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <VideoIcon className="h-4 w-4 mr-1" />
            Video
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => documentInputRef.current?.click()}
            className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <FileIcon className="h-4 w-4 mr-1" />
            Document
          </Button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files, 'video')}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files, 'document')}
        />

        {/* Post Button */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center space-x-2">
            {getVisibilityIcon()}
            <span className="text-sm text-gray-400">
              {getVisibilityLabel()}
            </span>
          </div>
          
          <Button
            onClick={handleCreatePost}
            disabled={isPosting || !connected || (!content.trim() && mediaFiles.length === 0)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            {isPosting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```