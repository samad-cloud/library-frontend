'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Tag, MessageSquare, Bot, Zap, Image as ImageIcon, Crop, Edit3 } from 'lucide-react'
import { 
  saveToSessionStorage, 
  loadFromSessionStorage, 
  STORAGE_KEYS,
  type GrouponGeneratorState 
} from '@/lib/sessionStorage'
import SaveImageButton from '@/components/shared/SaveImageButton'

interface GrouponGeneratorProps {
  isAuthenticated?: boolean
}

interface WorkflowStep {
  name: string
  status: 'pending' | 'loading' | 'completed' | 'error'
  message?: string
  icon: React.ComponentType<{ className?: string }>
}

export default function GrouponGenerator({ isAuthenticated }: GrouponGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9')
  const [generatedContent, setGeneratedContent] = useState('')
  const [generatedImages, setGeneratedImages] = useState<Array<{
    index: number;
    prompt: string;
    imageUrl: string;
    error?: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { name: 'Creating Thread', status: 'pending', icon: MessageSquare },
    { name: 'Processing with Assistant', status: 'pending', icon: Bot },
    { name: 'Generating 6 Images', status: 'pending', icon: ImageIcon },
    { name: 'Finalizing', status: 'pending', icon: Zap }
  ])

  // Load state from sessionStorage on component mount
  useEffect(() => {
    const savedState = loadFromSessionStorage<GrouponGeneratorState>(STORAGE_KEYS.GROUPON)
    if (savedState) {
      setPrompt(savedState.prompt)
      setSelectedAspectRatio(savedState.selectedAspectRatio)
      setGeneratedContent(savedState.generatedContent)
      setGeneratedImages(savedState.generatedImages || [])
      setError(savedState.error)
      // Don't restore workflowSteps from storage as icons can't be serialized
      // They will be reset to their initial state
    }
  }, [])

  // Save state to sessionStorage whenever important state changes
  // Exclude workflowSteps as React components can't be serialized
  useEffect(() => {
    const stateToSave: GrouponGeneratorState = {
      prompt,
      selectedAspectRatio,
      generatedContent,
      generatedImages,
      error,
      workflowSteps: [] // Don't save workflow steps as they contain React components
    }
    saveToSessionStorage(STORAGE_KEYS.GROUPON, stateToSave)
  }, [prompt, selectedAspectRatio, generatedContent, generatedImages, error])

  const updateWorkflowStep = (stepName: string, status: WorkflowStep['status'], message?: string) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.name === stepName 
        ? { ...step, status, message }
        : step
    ))
  }

  const navigateToEditor = (imageUrl: string, imageName: string = 'Groupon Image') => {
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

  const generateGroupon = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt before generating')
      return
    }

    setError(null)
    setGeneratedContent('')
    setGeneratedImages([])
    
    // Reset all steps to pending
    setWorkflowSteps(prev => prev.map(step => ({ ...step, status: 'pending' })))

    try {
      // Step 1: Creating Thread
      updateWorkflowStep('Creating Thread', 'loading', 'Creating new conversation thread...')
      
      const response = await fetch('/api/groupon-generate', {
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
        throw new Error(errorData.error || 'Failed to generate Groupon content')
      }

      const result = await response.json()
      
      // Simulate progressive loading based on typical timing
      updateWorkflowStep('Creating Thread', 'completed', 'Thread created successfully')
      
      // Processing with Assistant
      updateWorkflowStep('Processing with Assistant', 'loading', 'AI assistant analyzing and generating content...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateWorkflowStep('Processing with Assistant', 'completed', 'Content generated by AI assistant')
      updateWorkflowStep('Generating 6 Images', 'loading', 'Creating 6 images with Imagen 4...')
      
      // Set content as soon as available
      setGeneratedContent(result.content)
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateWorkflowStep('Generating 6 Images', 'completed', `Generated ${result.successfulImages}/${result.totalImages} images with Imagen 4`)
      
      // Process the 6 generated images
      if (result.images && Array.isArray(result.images)) {
        const processedImages = result.images.map((img: any) => ({
          ...img,
          imageUrl: img.imageUrl && img.imageUrl !== 'placeholder' 
            ? (img.imageUrl.startsWith('data:') ? img.imageUrl : `data:image/png;base64,${img.imageUrl}`)
            : ''
        }))
        setGeneratedImages(processedImages)
      }
      
      updateWorkflowStep('Finalizing', 'completed', 'Groupon content ready!')

    } catch (err) {
      console.error('Groupon generation error:', err)
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
        <h3 className="text-lg font-semibold mb-2">Groupon Generator</h3>
        <p className="text-gray-600 text-sm">Create compelling Groupon deal content with AI-generated visuals using OpenAI Assistant and Imagen 4.</p>
      </div>

      {/* Prompt Input Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your Groupon deal prompt here... (e.g., 'Create a Groupon deal for a luxury spa package with 50% off massage therapy')"
              className="min-h-[120px] resize-none"
            />
            
            {/* Aspect Ratio Display (Fixed for Groupon) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Crop className="w-4 h-4" />
                Image Aspect Ratio
              </label>
              <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                16:9 (Horizontal) - Optimized for Groupon deals
              </div>
              <p className="text-xs text-gray-500">
                Groupon images are automatically generated in 16:9 format for optimal display
              </p>
            </div>
            
            <Button 
              onClick={generateGroupon}
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
                  <Tag className="w-4 h-4 mr-2" />
                  Generate Groupon Deal
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
      {(generatedContent || generatedImages.length > 0) && (
        <div className="space-y-6">
          {/* Generated Content */}
          {generatedContent && (
            <Card>
              <div className="bg-green-600 text-white text-center py-2 rounded-t-lg">
                <h4 className="font-medium">Generated Groupon Content</h4>
              </div>
              <CardContent className="p-6">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[300px] resize-none"
                  placeholder="Generated Groupon content will appear here..."
                />
              </CardContent>
            </Card>
          )}

          {/* Generated Images Grid */}
          {generatedImages.length > 0 && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Generated Images ({generatedImages.filter(img => img.imageUrl).length}/6)</h3>
                <p className="text-sm text-gray-600">Click on any image to view full size or edit</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((image, index) => (
                  <Card key={index} className="relative">
                    <div className="bg-green-600 text-white text-center py-2 rounded-t-lg">
                      <h4 className="font-medium text-sm">Image {image.index}</h4>
                    </div>
                    <CardContent className="p-4">
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                        {image.imageUrl ? (
                          <img 
                            src={image.imageUrl} 
                            alt={`AI-generated Groupon image ${image.index}`}
                            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90"
                            loading="lazy"
                            onClick={() => openImageInNewTab(image.imageUrl)}
                            onError={(e) => {
                              console.error('Failed to load image:', image.imageUrl)
                              e.currentTarget.alt = 'Failed to load generated image'
                            }}
                          />
                        ) : image.error ? (
                          <div className="text-center text-red-500 p-4">
                            <p className="text-sm">Error: {image.error}</p>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Image generation failed</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Image Prompt Display */}
                      <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <p className="line-clamp-2">{image.prompt}</p>
                      </div>
                      
                      {image.imageUrl && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 text-green-600 hover:text-green-700"
                              onClick={() => openImageInNewTab(image.imageUrl)}
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 text-green-600 hover:text-green-700"
                              onClick={() => navigateToEditor(image.imageUrl, `Groupon Image ${image.index}`)}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                          <SaveImageButton
                            imageUrl={image.imageUrl}
                            generator="groupon"
                            modelName="Imagen 4"
                            promptUsed={image.prompt}
                            aspectRatio="16:9"
                            className="w-full text-green-600 hover:text-green-700"
                            disabled={!isAuthenticated}
                          >
                            Save Image {image.index}
                          </SaveImageButton>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
