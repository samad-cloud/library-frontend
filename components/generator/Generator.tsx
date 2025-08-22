'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

import { Card, CardContent } from "@/components/ui/card"
import { Expand, Loader2 } from 'lucide-react'

interface GeneratorProps {
  isAuthenticated?: boolean
}

interface ModelResult {
  modelName: string;
  imageUrls: string[];
  error?: string;
}

interface SocialMediaResult {
  caption: string;
  enhancedPrompt: {
    scene: string;
    shot_type: string;
    composition: string;
    colour_palette: string;
    aspect_ratio: string;
  };
  models: ModelResult[];
  timestamp: string;
}

export default function Generator({ isAuthenticated }: GeneratorProps) {
  const [basicPrompt, setBasicPrompt] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [selectedModels, setSelectedModels] = useState({
    geminiImagen3: true,
    geminiImagen4: true,
    geminiImagen4Ultra: true
  })
  const [instagramContent, setInstagramContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [generatedResults, setGeneratedResults] = useState<SocialMediaResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openImageInNewTab = (dataUrl: string) => {
    // Create a temporary anchor element to handle data URL opening
    const link = document.createElement('a')
    link.href = dataUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    
    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const enhancePrompt = async () => {
    if (!basicPrompt.trim()) {
      setError('Please enter a prompt before enhancing')
      return
    }

    setIsEnhancing(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: basicPrompt,
          enhanceOnly: true // New parameter to only enhance prompt
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enhance prompt')
      }

      const result = await response.json()
      
      // Set the enhanced prompt from the AI-generated scene
      setEnhancedPrompt(result.enhancedPrompt.scene)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while enhancing prompt')
      console.error('Enhancement error:', err)
    } finally {
      setIsEnhancing(false)
    }
  }

  const generatePost = async () => {
    if (!basicPrompt.trim()) {
      setError('Please enter a prompt before generating')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get selected model names
      const selectedModelNames = Object.entries(selectedModels)
        .filter(([_, isSelected]) => isSelected)
        .map(([modelName, _]) => modelName)

      if (selectedModelNames.length === 0) {
        setError('Please select at least one model')
        setIsLoading(false)
        return
      }

      // Use enhanced prompt if available, otherwise use basic prompt
      const promptToUse = enhancedPrompt.trim() ? enhancedPrompt : basicPrompt
      const skipEnhancement = enhancedPrompt.trim() ? true : false

      const response = await fetch('/api/generate-social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: promptToUse,
          selectedModels: selectedModelNames,
          skipEnhancement: skipEnhancement
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate social media content')
      }

      const result: SocialMediaResult = await response.json()
      setGeneratedResults(result)
      
      // Update the enhanced prompt with the AI-generated one (only if we didn't skip enhancement)
      if (!skipEnhancement) {
        setEnhancedPrompt(result.enhancedPrompt.scene)
      }
      
      // Update Instagram content with the generated caption
      setInstagramContent(result.caption)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      console.error('Generation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const modelOptions = [
    {
      id: 'geminiImagen3',
      name: 'Gemini Imagen 3',
      cost: 'Low cost',
      costColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'geminiImagen4',
      name: 'Gemini Imagen 4',
      cost: 'Medium cost',
      costColor: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'geminiImagen4Ultra',
      name: 'Gemini Imagen 4 Ultra',
      cost: 'High cost',
      costColor: 'bg-red-100 text-red-800'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Prompt Input Section */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Textarea
                value={basicPrompt}
                onChange={(e) => setBasicPrompt(e.target.value)}
                placeholder="Enter your basic prompt here... (e.g., 'Family enjoying photoshoot in living room, UK')"
                className="min-h-[100px] resize-none"
              />
                                  <Button 
                      onClick={enhancePrompt}
                      disabled={isEnhancing}
                      variant="secondary"
                      className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                    >
                      {isEnhancing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        'Enhance Prompt'
                      )}
                    </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Prompt Display */}
        <Card>
          <CardContent className="p-6">
            <Textarea
              value={enhancedPrompt}
              onChange={(e) => setEnhancedPrompt(e.target.value)}
              placeholder="Enhanced prompt will appear here... You can edit it before generating posts."
              className="min-h-[120px] resize-none"
            />
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Models to Generate</h3>
            <div className="space-y-3">
              {modelOptions.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={selectedModels[model.id as keyof typeof selectedModels]}
                      onCheckedChange={(checked) => 
                        setSelectedModels(prev => ({ ...prev, [model.id]: checked }))
                      }
                      className="data-[state=checked]:bg-pink-500"
                    />
                    <span className="font-medium">{model.name}</span>
                  </div>
                  <Badge className={model.costColor}>
                    {model.cost}
                  </Badge>
                </div>
              ))}
            </div>
            <Button 
              onClick={generatePost}
              disabled={isLoading}
              className="w-full mt-6 bg-gray-400 hover:bg-gray-500 text-white disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : enhancedPrompt.trim() ? (
                'Generate Post (using enhanced prompt)'
              ) : (
                'Generate Post'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Model Output Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modelOptions.map((model) => {
            const modelResult = generatedResults?.models.find(m => m.modelName === model.id)
            const isModelSelected = selectedModels[model.id as keyof typeof selectedModels]
            const hasImages = modelResult?.imageUrls && modelResult.imageUrls.length > 0
            const hasError = modelResult?.error

            return (
              <Card key={model.id} className="relative">
                <div className="bg-pink-500 text-white text-center py-2 rounded-t-lg">
                  <h4 className="font-medium">{model.name}</h4>
                </div>
                <CardContent className="p-6">
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                    {isLoading && isModelSelected ? (
                      <div className="text-center text-gray-500">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        <p className="text-sm">Generating...</p>
                      </div>
                    ) : hasImages ? (
                      <img 
                        src={modelResult.imageUrls[0]} 
                        alt={`Generated by ${model.name}`}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          console.error('Failed to load image:', modelResult.imageUrls[0])
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : hasError ? (
                      <div className="text-center text-red-500 p-4">
                        <p className="text-sm">Error: {modelResult.error}</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Expand className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">
                          {isModelSelected ? 'Enter a prompt to generate' : 'Model not selected'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {hasImages && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-pink-500 hover:text-pink-600"
                      onClick={() => openImageInNewTab(modelResult.imageUrls[0])}
                    >
                      <Expand className="w-4 h-4 mr-2" />
                      View Full Size
                    </Button>
                  )}
                  
                  {hasImages && modelResult.imageUrls.length > 1 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {modelResult.imageUrls.slice(1).map((url, index) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`Generated by ${model.name} - ${index + 2}`}
                          className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => openImageInNewTab(url)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Instagram Post Content */}
        <Card>
          <CardContent className="p-6">
            <Textarea
              value={instagramContent}
              onChange={(e) => setInstagramContent(e.target.value)}
              placeholder="Your Instagram post content will appear here..."
              className="min-h-[100px] resize-none"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}