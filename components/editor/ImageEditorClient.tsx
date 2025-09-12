'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Send, Loader2, Paperclip, Edit3, Sparkles, ChevronDown, ChevronUp, RotateCcw, Save, Download } from 'lucide-react'
import { saveEditedImage } from '@/utils/supabase/imageStorage'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  timestamp: number
}

interface ImageEditorClientProps {
  isAuthenticated: boolean
}

type EditorMode = 'edit' | 'create'

export default function ImageEditorClient({ isAuthenticated }: ImageEditorClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [attachedImageName, setAttachedImageName] = useState<string>('')
  const [latestImageRef, setLatestImageRef] = useState<string | null>(null) // Track latest image for reference
  const [sessionImages, setSessionImages] = useState<string[]>([]) // Track all generated images in session
  const [currentImageIndex, setCurrentImageIndex] = useState(0) // Index of currently selected reference image
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set()) // Track which messages are expanded
  const [isSaving, setIsSaving] = useState(false) // Track save state
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null) // Track save success message
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle URL parameters and sessionStorage for loading reference images
  useEffect(() => {
    const referenceImage = searchParams.get('ref')
    const imageName = searchParams.get('name') || 'Generated Image'
    const source = searchParams.get('source')
    const isFromCleanup = searchParams.get('cleanup') === 'true'
    
    let imageDataUrl: string | null = null
    let finalImageName = imageName
    
    if (source === 'session') {
      // Load from sessionStorage for large images
      const storedImage = sessionStorage.getItem('editorImageData')
      const storedName = sessionStorage.getItem('editorImageName')
      
      if (storedImage) {
        imageDataUrl = storedImage
        finalImageName = storedName || 'Generated Image'
        
        console.log('📦 Loaded image from sessionStorage:', {
          name: finalImageName,
          length: imageDataUrl.length,
          isDataUrl: imageDataUrl.startsWith('data:')
        })
        
        // Clean up sessionStorage
        sessionStorage.removeItem('editorImageData')
        sessionStorage.removeItem('editorImageName')
      }
    } else if (source === 'error') {
      // Handle error case - show error message but allow editor to function
      const errorMessage = sessionStorage.getItem('editorError')
      if (errorMessage) {
        console.warn('Editor navigation error:', errorMessage)
        // You could set this in state to display to user if needed
        // setError(errorMessage)
        sessionStorage.removeItem('editorError')
      }
    } else if (referenceImage) {
      // Load from URL parameters
      try {
        const decodedImage = decodeURIComponent(referenceImage)
        
        // Handle different types of image URLs
        if (decodedImage.startsWith('data:')) {
          // Data URL - use directly
          imageDataUrl = decodedImage
        } else if (decodedImage.startsWith('http')) {
          // HTTP URL (including from editor-cleanup bucket) - use directly
          imageDataUrl = decodedImage
        } else {
          // Assume base64 string - convert to data URL
          imageDataUrl = `data:image/png;base64,${decodedImage}`
        }
        
        // Decode the image name as well if it comes from URL parameters
        try {
          finalImageName = decodeURIComponent(imageName)
        } catch (nameDecodeError) {
          console.warn('Failed to decode image name, using as-is:', nameDecodeError)
          finalImageName = imageName
        }
        
        console.log('🔗 Loaded image from URL parameters:', {
          name: finalImageName,
          length: imageDataUrl.length,
          isDataUrl: imageDataUrl.startsWith('data:'),
          isHttpUrl: imageDataUrl.startsWith('http'),
          isFromCleanup
        })
      } catch (error) {
        console.error('Error loading reference image from URL:', error)
      }
    }
    
    if (imageDataUrl) {
      setAttachedImage(imageDataUrl)
      setAttachedImageName(finalImageName)
      setLatestImageRef(imageDataUrl)
      
      // Add to session images
      setSessionImages(prev => {
        if (!prev.includes(imageDataUrl)) {
          const newImages = [...prev, imageDataUrl]
          setCurrentImageIndex(newImages.length - 1)
          return newImages
        }
        return prev
      })
      
      // Clear URL parameters after loading
      const url = new URL(window.location.href)
      url.searchParams.delete('ref')
      url.searchParams.delete('name')
      url.searchParams.delete('source')
      router.replace(url.pathname, { scroll: false })
    }
  }, [searchParams, router])

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const renderMessageContent = (message: ChatMessage) => {
    const isExpanded = expandedMessages.has(message.id)
    const content = message.content
    const isLongMessage = content.length > 300 // Threshold for "long" messages
    
    if (!isLongMessage) {
      return (
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-900 whitespace-pre-wrap m-0">{content}</p>
        </div>
      )
    }

    const truncatedContent = content.substring(0, 300) + '...'
    
    return (
      <div className="prose prose-sm max-w-none">
        <p className="text-gray-900 whitespace-pre-wrap m-0">
          {isExpanded ? content : truncatedContent}
        </p>
        <button
          onClick={() => toggleMessageExpansion(message.id)}
          className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show more
            </>
          )}
        </button>
      </div>
    )
  }

  const openImageInNewTab = (imageUrl: string) => {
    console.log('Opening image in new tab:', {
      url: imageUrl?.substring(0, 100) + '...',
      startsWithData: imageUrl?.startsWith('data:'),
      length: imageUrl?.length
    })
    
    if (!imageUrl) {
      console.error('Invalid image URL provided')
      return
    }
    
    if (imageUrl.startsWith('data:')) {
      // For data URLs, open directly
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Image Editor Result</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
              <img src="${imageUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
            </body>
          </html>
        `)
        newWindow.document.close()
      }
    } else {
      // For regular URLs
      window.open(imageUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setAttachedImage(imageUrl)
      setAttachedImageName(file.name)
      setLatestImageRef(imageUrl) // Update latest image reference
      
      // Add uploaded image to session images if not already present
      setSessionImages(prev => {
        if (!prev.includes(imageUrl)) {
          const newImages = [...prev, imageUrl]
          setCurrentImageIndex(newImages.length - 1) // Set to newly uploaded image
          return newImages
        }
        return prev
      })
    }
    reader.readAsDataURL(file)
  }, [])

  // Clear save success message after 5 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const removeAttachedImage = () => {
    setAttachedImage(null)
    setAttachedImageName('')
  }

  const cycleToNextImage = () => {
    if (sessionImages.length <= 1) return
    
    const nextIndex = (currentImageIndex + 1) % sessionImages.length
    setCurrentImageIndex(nextIndex)
    setLatestImageRef(sessionImages[nextIndex])
  }

  const getCurrentReferenceImage = () => {
    if (attachedImage) return attachedImage
    if (sessionImages.length > 0 && sessionImages[currentImageIndex]) {
      return sessionImages[currentImageIndex]
    }
    return latestImageRef
  }

  // Helper function to convert HTTP URLs to base64 for API calls
  const convertToBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      if (imageUrl.startsWith('data:')) {
        // Already a data URL, return as is
        return imageUrl
      }
      
      if (imageUrl.startsWith('http')) {
        // HTTP URL - fetch and convert to base64
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }
      
      return null
    } catch (error) {
      console.error('Error converting image to base64:', error)
      return null
    }
  }

  const getReferenceImageLabel = () => {
    if (attachedImage) return attachedImageName
    if (sessionImages.length > 1) {
      return `Generated image ${currentImageIndex + 1} of ${sessionImages.length}`
    }
    return "Latest generated image"
  }

  const sendMessage = async () => {
    // For creation mode, only text is required. For edit mode, image is required.
    if (!currentMessage.trim()) return
    if (editorMode === 'edit' && !getCurrentReferenceImage()) return

    const currentRefImage = getCurrentReferenceImage()

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: currentMessage,
      imageUrl: editorMode === 'edit' ? (currentRefImage || undefined) : undefined,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    const messageText = currentMessage
    const imageForAPI = editorMode === 'edit' ? currentRefImage : null
    
    // Reset form but keep latest image reference for edit mode
    setCurrentMessage('')
    setAttachedImage(null)
    setAttachedImageName('')
    setIsLoading(true)

    try {
      const endpoint = editorMode === 'edit' ? '/api/image-editor' : '/api/image-creator'
      
      let requestBody: any
      
      if (editorMode === 'edit') {
        // Convert image URL to base64 for API
        const base64Image = await convertToBase64(imageForAPI!)
        if (!base64Image) {
          throw new Error('Failed to process image for editing')
        }
        
        // Extract base64 data (remove data:image/...;base64, prefix)
        const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image
        
        requestBody = {
          imageBase64: base64Data,
          instruction: messageText
        }
      } else {
        requestBody = {
          prompt: messageText,
          conversationHistory: messages // Keep conversation history for image creator (different API)
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to process image ${editorMode}`)
      }

      const data = await response.json()
      
      if (data.success) {
        let assistantMessage: ChatMessage
        
        if (editorMode === 'create') {
          // Handle create mode response
          assistantMessage = {
            id: data.message?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: data.message?.content || 'Image created successfully.',
            imageUrl: data.message?.imageUrl,
            timestamp: data.message?.timestamp || Date.now()
          }
          
          // Update latest image reference and session images if AI created an image
          if (data.hasCreatedImage && data.message?.imageUrl) {
            setLatestImageRef(data.message.imageUrl)
            
            // Add new created image to session images
            setSessionImages(prev => {
              const newImages = [...prev, data.message.imageUrl]
              setCurrentImageIndex(newImages.length - 1) // Set to newest image
              return newImages
            })
          }
        } else {
          // Handle edit mode response
          assistantMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: data.instructions || 'Image editing completed.',
            imageUrl: data.editedImageUrl,
            timestamp: data.timestamp || Date.now()
          }
          
          // Update latest image reference and session images if AI returned an image
          if (data.hasEditedImage && data.editedImageUrl) {
            setLatestImageRef(data.editedImageUrl)
            
            // Add new generated image to session images
            setSessionImages(prev => {
              const newImages = [...prev, data.editedImageUrl]
              setCurrentImageIndex(newImages.length - 1) // Set to newest image
              return newImages
            })
          }
        }
        
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || `Failed to ${editorMode} image`)
      }
    } catch (error) {
      console.error(`Error ${editorMode}ing image:`, error)
      
      let errorText = 'Sorry, I encountered an error while processing your request.'
      
      if (error instanceof Error) {
        // Provide more specific error messages
        if (error.message.includes('fetch')) {
          errorText = 'Network error: Unable to reach the image processing server. Please check your connection and try again.'
        } else if (error.message.includes('400')) {
          errorText = 'Invalid request: Please ensure you have provided all required information and try again.'
        } else if (error.message.includes('500')) {
          errorText = 'Server error: The image processing service is currently experiencing issues. Please try again later.'
        } else {
          errorText = `Error: ${error.message}`
        }
      }
      
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: errorText,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setTimeout(scrollToBottom, 100)
    }
  }

  // Save a specific image to Supabase storage
  const saveSpecificImage = async (imageUrl: string, messageId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to save images.')
      return
    }

    if (!imageUrl) {
      alert('No image to save.')
      return
    }

    setIsSaving(true)
    setSaveSuccess(null)

    try {
      // Find the user message that led to this image
      const messageIndex = messages.findIndex(m => m.id === messageId)
      const relatedUserMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user')
      const instruction = relatedUserMessage?.content || 'Image edited'
      
      // Generate a descriptive filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `edited_image_${timestamp}.png`

      const result = await saveEditedImage({
        imageUrl,
        fileName,
        instruction,
        originalImageName: attachedImageName || 'Unknown'
      })

      if (result.success) {
        setSaveSuccess(`Image saved successfully!`)
        console.log('Image saved to:', result.url)
      } else {
        throw new Error(result.error || 'Failed to save image')
      }
    } catch (error) {
      console.error('Error saving image:', error)
      alert(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Download a specific image
  const downloadSpecificImage = (imageUrl: string) => {
    if (!imageUrl) {
      alert('No image to download.')
      return
    }

    try {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `edited_image_${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image. Please try right-clicking the image and selecting "Save image as..."')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Mode Selector */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-center">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setEditorMode('edit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                editorMode === 'edit'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Edit Image
            </button>
            <button
              onClick={() => setEditorMode('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                editorMode === 'create'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Create Image
            </button>
          </div>
        </div>
        
        {/* Success Message */}
        {saveSuccess && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{saveSuccess}</p>
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (latestImageRef || sessionImages.length > 0) && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Debug: {sessionImages.length} images loaded, latest ref: {latestImageRef ? 'yes' : 'no'}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                {editorMode === 'edit' ? (
                  <Edit3 className="w-8 h-8 text-white" />
                ) : (
                  <Sparkles className="w-8 h-8 text-white" />
                )}
              </div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">Hello, how can I help you today?</h2>
              <p className="text-gray-600">
                {editorMode === 'edit' 
                  ? 'Upload an image and describe how you\'d like me to edit it'
                  : 'Describe the image you\'d like me to create for you'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="flex gap-4">
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                )}
                
                <div className={`flex-1 ${message.role === 'user' ? 'ml-12' : ''}`}>
                  {message.imageUrl && (
                    <div className="mb-3 relative group">
                      <img
                        src={message.imageUrl}
                        alt="Message image"
                        className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 border border-gray-200 hover:border-gray-300 transition-all"
                        onClick={() => openImageInNewTab(message.imageUrl!)}
                      />
                      
                      {/* Action buttons overlay */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 bg-black/70 hover:bg-black/80 border-0 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            saveSpecificImage(message.imageUrl!, message.id)
                          }}
                          disabled={isSaving || !isAuthenticated}
                          title={isAuthenticated ? "Save to gallery" : "Sign in to save"}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 text-white animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 text-white" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 bg-black/70 hover:bg-black/80 border-0 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadSpecificImage(message.imageUrl!)
                          }}
                          title="Download image"
                        >
                          <Download className="w-3 h-3 text-white" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {message.content && renderMessageContent(message)}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        {/* Image Reference Preview - Only show in edit mode or when there's an image */}
        {(editorMode === 'edit' && getCurrentReferenceImage()) && (
          <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <img
              src={getCurrentReferenceImage()!}
              alt={attachedImage ? "Attached" : "Reference"}
              className="w-12 h-12 object-cover rounded"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {getReferenceImageLabel()}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">
                  {attachedImage ? "Ready to process" : "Using as reference"}
                </p>
                {!attachedImage && sessionImages.length > 1 && (
                  <button
                    onClick={cycleToNextImage}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Switch
                  </button>
                )}
              </div>
            </div>
            {attachedImage && (
              <Button
                onClick={removeAttachedImage}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            )}
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Image Upload Button - Only show in edit mode */}
          {editorMode === 'edit' && (
            <Button
              onClick={handleFileSelect}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 rounded-full w-10 h-10"
              disabled={isLoading}
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}

          <div className="flex-1 relative">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                editorMode === 'create'
                  ? "Describe the image you want to create..."
                  : getCurrentReferenceImage() 
                    ? "Continue editing the image..." 
                    : "Upload an image and describe how to edit it..."
              }
              disabled={isLoading}
              className="pr-12 py-3 rounded-2xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <Button
              onClick={sendMessage}
              disabled={
                !currentMessage.trim() || 
                (editorMode === 'edit' && !getCurrentReferenceImage()) || 
                isLoading
              }
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full w-8 h-8 disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleImageUpload(e.target.files[0])
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  )
}
