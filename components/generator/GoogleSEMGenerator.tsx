'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, MessageSquare, Bot, Zap, Image as ImageIcon, Crop, ShoppingBag, Edit3 } from 'lucide-react'
import { 
  saveToSessionStorage, 
  loadFromSessionStorage, 
  STORAGE_KEYS,
  type GoogleSEMGeneratorState 
} from '@/lib/sessionStorage'
import SaveImageButton from '@/components/shared/SaveImageButton'
import DownloadImageButton from '@/components/shared/DownloadImageButton'

interface GoogleSEMGeneratorProps {
  isAuthenticated?: boolean
}

interface WorkflowStep {
  name: string
  status: 'pending' | 'loading' | 'completed' | 'error'
  message?: string
  icon: React.ComponentType<{ className?: string }>
}

export default function GoogleSEMGenerator({ isAuthenticated }: GoogleSEMGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1')
  const [generatedContent, setGeneratedContent] = useState('')
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [googleAdsImage, setGoogleAdsImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { name: 'Creating Thread', status: 'pending', icon: MessageSquare },
    { name: 'Processing with Assistant', status: 'pending', icon: Bot },
    { name: 'Generating Base Image', status: 'pending', icon: ImageIcon },
    { name: 'Creating Google Ads Variant', status: 'pending', icon: ShoppingBag },
    { name: 'Finalizing', status: 'pending', icon: Zap }
  ])

  // Load state from sessionStorage on component mount
  useEffect(() => {
    const savedState = loadFromSessionStorage<GoogleSEMGeneratorState>(STORAGE_KEYS.GOOGLE_SEM)
    if (savedState) {
      setPrompt(savedState.prompt)
      setSelectedAspectRatio(savedState.selectedAspectRatio)
      setGeneratedContent(savedState.generatedContent)
      setOriginalImage(savedState.originalImage)
      setGoogleAdsImage(savedState.googleAdsImage)
      setError(savedState.error)
      // Don't restore workflowSteps from storage as icons can't be serialized
      // They will be reset to their initial state
    }
  }, [])

  // Save state to sessionStorage whenever important state changes
  // Exclude workflowSteps as React components can't be serialized
  useEffect(() => {
    const stateToSave: GoogleSEMGeneratorState = {
      prompt,
      selectedAspectRatio,
      generatedContent,
      originalImage,
      googleAdsImage,
      error,
      workflowSteps: [] // Don't save workflow steps as they contain React components
    }
    saveToSessionStorage(STORAGE_KEYS.GOOGLE_SEM, stateToSave)
  }, [prompt, selectedAspectRatio, generatedContent, originalImage, googleAdsImage, error])

  const updateWorkflowStep = (stepName: string, status: WorkflowStep['status'], message?: string) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.name === stepName 
        ? { ...step, status, message }
        : step
    ))
  }

  const navigateToEditor = (imageUrl: string, imageName: string = 'Google SEM Image') => {
    if (!imageUrl) return
    
    try {
      console.log('🚀 Navigating to editor with image:', {
        url: imageUrl.substring(0, 50) + '...',
        name: imageName,
        length: imageUrl.length,
        isDataUrl: imageUrl.startsWith('data:')
      })
      
      // For large data URLs, use sessionStorage instead of URL params to avoid length limits
      if (imageUrl.length > 2000) {
        console.log('📦 Using sessionStorage for large image data')
        sessionStorage.setItem('editorImageData', imageUrl)
        sessionStorage.setItem('editorImageName', imageName)
        router.push('/editor?source=session')
      } else {
        // For smaller URLs, use URL parameters
        const encodedImage = encodeURIComponent(imageUrl)
        const encodedName = encodeURIComponent(imageName)
        router.push(`/editor?ref=${encodedImage}&name=${encodedName}`)
      }
    } catch (error) {
      console.error('Error navigating to editor:', error)
      // Fallback to sessionStorage if URL encoding fails
      try {
        sessionStorage.setItem('editorImageData', imageUrl)
        sessionStorage.setItem('editorImageName', imageName)
        router.push('/editor?source=session')
      } catch (storageError) {
        console.error('Failed to use sessionStorage fallback:', storageError)
        alert('Failed to open editor. The image may be too large.')
      }
    }
  }

  const generateGoogleSEM = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt before generating')
      return
    }

    setError(null)
    setGeneratedContent('')
    setOriginalImage(null)
    setGoogleAdsImage(null)
    
    // Reset all steps to pending
    setWorkflowSteps(prev => prev.map(step => ({ ...step, status: 'pending' })))

    try {
      // Step 1: Creating Thread
      updateWorkflowStep('Creating Thread', 'loading', 'Creating new conversation thread...')
      
      // Create a streaming-like experience by polling for updates
      const controller = new AbortController()
      
      const response = await fetch('/api/google-sem-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio: selectedAspectRatio,
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate Google SEM content')
      }

      // Simulate progressive loading based on typical timing
      updateWorkflowStep('Creating Thread', 'completed', 'Thread created successfully')
      
      // Processing with Assistant
      updateWorkflowStep('Processing with Assistant', 'loading', 'AI assistant analyzing and generating content...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const result = await response.json()
      
      updateWorkflowStep('Processing with Assistant', 'completed', 'Content generated by AI assistant')
      updateWorkflowStep('Generating Base Image', 'loading', 'Creating image with Imagen 4...')
      
      // Set content as soon as available
      setGeneratedContent(result.content)
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateWorkflowStep('Generating Base Image', 'completed', 'Base image generated with Imagen 4')
      
      // Fix image display - ensure proper data URL format
      if (result.originalImageUrl) {
        const originalImageDataUrl = result.originalImageUrl.startsWith('data:') 
          ? result.originalImageUrl 
          : `data:image/png;base64,${result.originalImageUrl}`
        setOriginalImage(originalImageDataUrl)
      }
      
      updateWorkflowStep('Creating Google Ads Variant', 'loading', 'Converting to Google Ads format with Nano Banana...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateWorkflowStep('Creating Google Ads Variant', 'completed', 'Google Ads variant created with Nano Banana')
      
      // Fix Google Ads image display
      if (result.googleAdsImageUrl && result.googleAdsImageUrl !== 'data:image/png;base64,google_ads_placeholder') {
        const googleAdsImageDataUrl = result.googleAdsImageUrl.startsWith('data:') 
          ? result.googleAdsImageUrl 
          : `data:image/png;base64,${result.googleAdsImageUrl}`
        setGoogleAdsImage(googleAdsImageDataUrl)
      }
      
      updateWorkflowStep('Finalizing', 'completed', 'Google SEM content ready!')

    } catch (err) {
      console.error('Google SEM generation error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      
      // Mark current loading step as error
      setWorkflowSteps(prev => prev.map(step => 
        step.status === 'loading' 
          ? { ...step, status: 'error', message: 'Failed at this step' }
          : step
      ))
    }
  }

  const openImageInNewTab = (imageUrl: string) => {
    console.log('Opening image in new tab:', {
      url: imageUrl?.substring(0, 100) + '...',
      startsWithData: imageUrl?.startsWith('data:'),
      length: imageUrl?.length
    })
    
    if (!imageUrl || imageUrl === 'google_ads_placeholder') {
      console.error('Invalid image URL provided')
      return
    }
    
    if (imageUrl.startsWith('data:')) {
      // For data URLs, open directly
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Generated Image</title></head>
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

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Google SEM Generator</h3>
        <p className="text-gray-600 text-sm">Create Google Ads optimized content and images using OpenAI Assistant, Imagen 4, and Nano Banana for white background variants.</p>
      </div>

      {/* Prompt Input Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your Google SEM prompt here... (e.g., 'Create a Google Ads campaign for premium wireless headphones targeting tech professionals')"
              className="min-h-[120px] resize-none"
            />
            
            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Crop className="w-4 h-4" />
                Image Aspect Ratio
              </label>
              <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Square) - Google Display Ads</SelectItem>
                  <SelectItem value="9:16">9:16 (Vertical) - Mobile ads</SelectItem>
                  <SelectItem value="16:9">16:9 (Horizontal) - YouTube ads</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait) - Shopping ads</SelectItem>
                  <SelectItem value="4:3">4:3 (Landscape) - Banner ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={generateGoogleSEM}
              disabled={workflowSteps.some(step => step.status === 'loading')}
              className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {workflowSteps.some(step => step.status === 'loading') ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Generate Google SEM Content
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Progress */}
      {(workflowSteps.some(step => step.status !== 'pending') || workflowSteps.some(step => step.status === 'loading')) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generation Progress</h3>
            <div className="space-y-3">
              {workflowSteps.map((step, index) => (
                <div key={step.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-100 text-green-600' :
                    step.status === 'loading' ? 'bg-blue-100 text-blue-600' :
                    step.status === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {step.status === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'loading' ? 'text-blue-700' :
                      step.status === 'error' ? 'text-red-700' :
                      'text-gray-500'
                    }`}>
                      {step.name}
                    </div>
                    {step.message && (
                      <div className="text-sm text-gray-600 mt-1">
                        {step.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Generated Results */}
      {(generatedContent || originalImage || googleAdsImage) && (
        <div className="space-y-6">
          {/* Generated Content */}
          {generatedContent && (
            <Card>
              <div className="bg-green-600 text-white text-center py-2 rounded-t-lg">
                <h4 className="font-medium">Generated SEM Content</h4>
              </div>
              <CardContent className="p-6">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[200px] resize-none"
                  placeholder="Generated SEM content will appear here..."
                />
              </CardContent>
            </Card>
          )}

          {/* Generated Images */}
          {(originalImage || googleAdsImage) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Image */}
              {originalImage && (
                <Card>
                  <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg">
                    <h4 className="font-medium">Original Generated Image</h4>
                  </div>
                  <CardContent className="p-6">
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                      <img 
                        src={originalImage} 
                        alt="AI-generated original image"
                        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90"
                        loading="lazy"
                        onClick={(e) => {
                          e.preventDefault()
                          console.log('Original image click:', originalImage?.substring(0, 50) + '...')
                          openImageInNewTab(originalImage)
                        }}
                        onError={(e) => {
                          console.error('Failed to load original image:', originalImage)
                          e.currentTarget.alt = 'Failed to load generated image'
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-blue-600 hover:text-blue-700"
                          onClick={() => openImageInNewTab(originalImage)}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-green-600 hover:text-green-700"
                          onClick={() => navigateToEditor(originalImage, 'Original SEM Image')}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Image
                        </Button>
                        <DownloadImageButton
                          imageUrl={originalImage}
                          generator="google-sem"
                          modelName="Imagen_4_Original"
                          fileName="google_sem_original"
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-purple-600 hover:text-purple-700"
                        >
                          Download
                        </DownloadImageButton>
                      </div>
                      <SaveImageButton
                        imageUrl={originalImage}
                        generator="google-sem"
                        modelName="Imagen 4 Original"
                        className="w-full text-blue-600 hover:text-blue-700"
                        disabled={!isAuthenticated}
                      >
                        Save Original Image
                      </SaveImageButton>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Google Ads Optimized Image */}
              {googleAdsImage && (
                <Card>
                  <div className="bg-green-600 text-white text-center py-2 rounded-t-lg">
                    <h4 className="font-medium">Google Ads Optimized</h4>
                  </div>
                  <CardContent className="p-6">
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                      <img 
                        src={googleAdsImage} 
                        alt="Google Ads optimized image with white background"
                        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90"
                        loading="lazy"
                        onClick={(e) => {
                          e.preventDefault()
                          console.log('Google Ads image click:', googleAdsImage?.substring(0, 50) + '...')
                          openImageInNewTab(googleAdsImage)
                        }}
                        onError={(e) => {
                          console.error('Failed to load Google Ads image:', googleAdsImage)
                          e.currentTarget.alt = 'Failed to load Google Ads optimized image'
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-green-600 hover:text-green-700"
                          onClick={() => openImageInNewTab(googleAdsImage)}
                        >
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          View Full Size
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-purple-600 hover:text-purple-700"
                          onClick={() => navigateToEditor(googleAdsImage, 'Google Ads Optimized Image')}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Image
                        </Button>
                        <DownloadImageButton
                          imageUrl={googleAdsImage}
                          generator="google-sem"
                          modelName="Imagen_4_GoogleAds"
                          fileName="google_sem_optimized"
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-orange-600 hover:text-orange-700"
                        >
                          Download
                        </DownloadImageButton>
                      </div>
                      <SaveImageButton
                        imageUrl={googleAdsImage}
                        generator="google-sem"
                        modelName="Imagen 4 Google Ads"
                        className="w-full text-green-600 hover:text-green-700"
                        disabled={!isAuthenticated}
                      >
                        Save Google Ads Image
                      </SaveImageButton>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 text-center">
                      Optimized with white background via Nano Banana
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}