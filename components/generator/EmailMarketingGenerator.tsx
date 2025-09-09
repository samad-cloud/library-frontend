'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Mail, MessageSquare, Bot, Zap, Image as ImageIcon, Crop, Edit3 } from 'lucide-react'
import { 
  saveToSessionStorage, 
  loadFromSessionStorage, 
  STORAGE_KEYS,
  type EmailMarketingGeneratorState 
} from '@/lib/sessionStorage'
import SaveImageButton from '@/components/shared/SaveImageButton'

interface EmailMarketingGeneratorProps {
  isAuthenticated?: boolean
}

interface WorkflowStep {
  name: string
  status: 'pending' | 'loading' | 'completed' | 'error'
  message?: string
  icon: React.ComponentType<{ className?: string }>
}

export default function EmailMarketingGenerator({ isAuthenticated }: EmailMarketingGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1')
  const [generatedContent, setGeneratedContent] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { name: 'Creating Thread', status: 'pending', icon: MessageSquare },
    { name: 'Processing with Assistant', status: 'pending', icon: Bot },
    { name: 'Generating Image', status: 'pending', icon: ImageIcon },
    { name: 'Finalizing', status: 'pending', icon: Zap }
  ])

  // Load state from sessionStorage on component mount
  useEffect(() => {
    const savedState = loadFromSessionStorage<EmailMarketingGeneratorState>(STORAGE_KEYS.EMAIL_MARKETING)
    if (savedState) {
      setPrompt(savedState.prompt)
      setSelectedAspectRatio(savedState.selectedAspectRatio)
      setGeneratedContent(savedState.generatedContent)
      setGeneratedImage(savedState.generatedImage)
      setError(savedState.error)
      // Don't restore workflowSteps from storage as icons can't be serialized
      // They will be reset to their initial state
    }
  }, [])

  // Save state to sessionStorage whenever important state changes
  // Exclude workflowSteps as React components can't be serialized
  useEffect(() => {
    const stateToSave: EmailMarketingGeneratorState = {
      prompt,
      selectedAspectRatio,
      generatedContent,
      generatedImage,
      error,
      workflowSteps: [] // Don't save workflow steps as they contain React components
    }
    saveToSessionStorage(STORAGE_KEYS.EMAIL_MARKETING, stateToSave)
  }, [prompt, selectedAspectRatio, generatedContent, generatedImage, error])

  const updateWorkflowStep = (stepName: string, status: WorkflowStep['status'], message?: string) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.name === stepName 
        ? { ...step, status, message }
        : step
    ))
  }

  const navigateToEditor = (imageUrl: string, imageName: string = 'Email Marketing Image') => {
    if (!imageUrl) return
    
    try {
      // Encode the image data for URL transmission
      const encodedImage = encodeURIComponent(imageUrl)
      const encodedName = encodeURIComponent(imageName)
      
      // Navigate to editor with reference image
      router.push(`/editor?ref=${encodedImage}&name=${encodedName}`)
    } catch (error) {
      console.error('Error navigating to editor:', error)
    }
  }

  const generateEmailMarketing = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt before generating')
      return
    }

    setError(null)
    setGeneratedContent('')
    setGeneratedImage(null)
    
    // Reset all steps to pending
    setWorkflowSteps(prev => prev.map(step => ({ ...step, status: 'pending' })))

    try {
      // Step 1: Creating Thread
      updateWorkflowStep('Creating Thread', 'loading', 'Creating new conversation thread...')
      
      const response = await fetch('/api/email-marketing-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio: selectedAspectRatio,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate email marketing content')
      }

      const result = await response.json()
      
      // Simulate progressive loading based on typical timing
      updateWorkflowStep('Creating Thread', 'completed', 'Thread created successfully')
      
      // Processing with Assistant
      updateWorkflowStep('Processing with Assistant', 'loading', 'AI assistant analyzing and generating content...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateWorkflowStep('Processing with Assistant', 'completed', 'Content generated by AI assistant')
      updateWorkflowStep('Generating Image', 'loading', 'Creating image with Imagen 4...')
      
      // Set content as soon as available
      setGeneratedContent(result.content)
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateWorkflowStep('Generating Image', 'completed', 'Image generated with Imagen 4')
      
      // Fix image display - ensure proper data URL format
      if (result.imageUrl && result.imageUrl !== 'placeholder') {
        const imageDataUrl = result.imageUrl.startsWith('data:') 
          ? result.imageUrl 
          : `data:image/png;base64,${result.imageUrl}`
        setGeneratedImage(imageDataUrl)
      }
      
      updateWorkflowStep('Finalizing', 'completed', 'Email marketing content ready!')

    } catch (err) {
      console.error('Email marketing generation error:', err)
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
        <h3 className="text-lg font-semibold mb-2">Email Marketing Generator</h3>
        <p className="text-gray-600 text-sm">Create compelling email marketing content with AI-generated visuals using OpenAI Assistant and Imagen 4.</p>
      </div>

      {/* Prompt Input Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your email marketing prompt here... (e.g., 'Create an email campaign for a new skincare product launch targeted at women aged 25-40')"
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
                  <SelectItem value="1:1">1:1 (Square) - Social media posts</SelectItem>
                  <SelectItem value="9:16">9:16 (Vertical) - Stories, mobile</SelectItem>
                  <SelectItem value="16:9">16:9 (Horizontal) - Banners, presentations</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait) - Print materials</SelectItem>
                  <SelectItem value="4:3">4:3 (Landscape) - Classic format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={generateEmailMarketing}
              disabled={workflowSteps.some(step => step.status === 'loading')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {workflowSteps.some(step => step.status === 'loading') ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Generate Email Marketing
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
      {(generatedContent || generatedImage) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Generated Content */}
          {generatedContent && (
            <Card>
              <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg">
                <h4 className="font-medium">Generated Email Content</h4>
              </div>
              <CardContent className="p-6">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[300px] resize-none"
                  placeholder="Generated email content will appear here..."
                />
              </CardContent>
            </Card>
          )}

          {/* Generated Image */}
          {generatedImage && (
            <Card>
              <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg">
                <h4 className="font-medium">Generated Image</h4>
              </div>
              <CardContent className="p-6">
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  <img 
                    src={generatedImage} 
                    alt="AI-generated email marketing image"
                    className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90"
                    loading="lazy"
                    onClick={() => openImageInNewTab(generatedImage)}
                    onError={(e) => {
                      console.error('Failed to load image:', generatedImage)
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
                      onClick={() => openImageInNewTab(generatedImage)}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      View Full Size
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-green-600 hover:text-green-700"
                      onClick={() => navigateToEditor(generatedImage, 'Email Marketing Image')}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Image
                    </Button>
                  </div>
                  <SaveImageButton
                    imageUrl={generatedImage}
                    generator="email-marketing"
                    modelName="Imagen 4"
                    className="w-full text-blue-600 hover:text-blue-700"
                    disabled={!isAuthenticated}
                  >
                    Save to Library
                  </SaveImageButton>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}