'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Expand, Loader2, Crop, Edit3, Download } from 'lucide-react'
import { 
  saveToSessionStorage, 
  loadFromSessionStorage, 
  STORAGE_KEYS,
  type SocialMediaGeneratorState 
} from '@/lib/sessionStorage'
import { navigateToEditor } from '@/lib/editorNavigation'
import SaveImageButton from '@/components/shared/SaveImageButton'
import DownloadImageButton from '@/components/shared/DownloadImageButton'
import InstagramPostButton from '@/components/instagram/InstagramPostButton'

// Helper function to get standard model name for database storage
const getStandardModelName = (modelId: string): string => {
  const modelNameMap: { [key: string]: string } = {
    'geminiImagen3': 'imagen-3.0-generate-002',
    'geminiImagen4': 'imagen-4.0-generate-preview-06-06', 
    'geminiImagen4Ultra': 'imagen-4.0-generate-preview-06-06'
  }
  return modelNameMap[modelId] || 'imagen-4.0-generate-preview-06-06'
}

interface SocialMediaGeneratorProps {
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

export default function SocialMediaGenerator({ isAuthenticated }: SocialMediaGeneratorProps) {
  const router = useRouter()
  const [basicPrompt, setBasicPrompt] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1')
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

  // Load state from sessionStorage on component mount
  useEffect(() => {
    const savedState = loadFromSessionStorage<SocialMediaGeneratorState>(STORAGE_KEYS.SOCIAL_MEDIA)
    if (savedState) {
      setBasicPrompt(savedState.basicPrompt)
      setEnhancedPrompt(savedState.enhancedPrompt)
      setSelectedAspectRatio(savedState.selectedAspectRatio)
      setSelectedModels(savedState.selectedModels)
      setInstagramContent(savedState.instagramContent)
      setGeneratedResults(savedState.generatedResults)
      setError(savedState.error)
    }
  }, [])

  // Save state to sessionStorage whenever important state changes
  useEffect(() => {
    // Don't save loading states to avoid confusion when component reloads
    const stateToSave: SocialMediaGeneratorState = {
      basicPrompt,
      enhancedPrompt,
      selectedAspectRatio,
      selectedModels,
      instagramContent,
      generatedResults,
      error
    }
    saveToSessionStorage(STORAGE_KEYS.SOCIAL_MEDIA, stateToSave)
  }, [basicPrompt, enhancedPrompt, selectedAspectRatio, selectedModels, instagramContent, generatedResults, error])

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

  const handleNavigateToEditor = async (imageUrl: string, modelName: string = 'Social Media Image') => {
    await navigateToEditor({ 
      imageUrl, 
      imageName: `${modelName} - Social Media`, 
      router 
    })
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
          aspectRatio: selectedAspectRatio,
          enhanceOnly: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enhance prompt')
      }

      const result = await response.json()
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
      const selectedModelNames = Object.entries(selectedModels)
        .filter(([_, isSelected]) => isSelected)
        .map(([modelName, _]) => modelName)

      if (selectedModelNames.length === 0) {
        setError('Please select at least one model')
        setIsLoading(false)
        return
      }

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
          aspectRatio: selectedAspectRatio,
          skipEnhancement: skipEnhancement
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate social media content')
      }

      const result: SocialMediaResult = await response.json()
      setGeneratedResults(result)
      
      if (!skipEnhancement) {
        setEnhancedPrompt(result.enhancedPrompt.scene)
      }
      
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
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Social Media Content Generator</h3>
        <p className="text-gray-600 text-sm">Create engaging social media posts with AI-generated images and captions.</p>
      </div>

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
                  <SelectItem value="1:1">1:1 (Square) - Instagram posts</SelectItem>
                  <SelectItem value="9:16">9:16 (Vertical) - Instagram stories</SelectItem>
                  <SelectItem value="16:9">16:9 (Horizontal) - YouTube thumbnails</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait) - Pinterest</SelectItem>
                  <SelectItem value="4:3">4:3 (Landscape) - Facebook posts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
                      alt={`AI-generated image using ${model.name}`}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                      onError={(e) => {
                        console.error('Failed to load image:', modelResult.imageUrls[0])
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.alt = 'Failed to load generated image'
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
                  <div className="space-y-3">
                    {/* Top row - View and Edit actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-pink-500 hover:text-pink-600"
                        onClick={() => openImageInNewTab(modelResult.imageUrls[0])}
                      >
                        <Expand className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleNavigateToEditor(modelResult.imageUrls[0], model.name)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    
                    {/* Second row - Download and Save */}
                    <div className="grid grid-cols-2 gap-2">
                      <DownloadImageButton
                        imageUrl={modelResult.imageUrls[0]}
                        generator="social-media"
                        modelName={getStandardModelName(model.id)}
                        fileName={`social_media_${model.name.toLowerCase().replace(/\s+/g, '_')}`}
                        variant="ghost"
                        size="sm"
                        className="text-orange-500 hover:text-orange-600"
                      >
                        Download
                      </DownloadImageButton>
                      <SaveImageButton
                        imageUrl={modelResult.imageUrls[0]}
                        generator="social-media"
                        modelName={getStandardModelName(model.id)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-600"
                        disabled={!isAuthenticated}
                      >
                        Save
                      </SaveImageButton>
                    </div>
                    
                    {/* Third row - Instagram Post (full width) */}
                    <InstagramPostButton
                      imageUrl={modelResult.imageUrls[0]}
                      caption={instagramContent || `Check out this amazing ${model.name} generated image! #AI #GeneratedArt #Printerpix`}
                      modelName={getStandardModelName(model.id)}
                      variant="outline"
                      size="sm"
                      className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                      onSuccess={(result) => {
                        console.log('Successfully posted to Instagram:', result)
                        // You could show a success toast here
                      }}
                      onError={(error) => {
                        console.error('Failed to post to Instagram:', error)
                        // You could show an error toast here
                      }}
                    />
                  </div>
                )}
                
                {hasImages && modelResult.imageUrls.length > 1 && (
                  <div className="mt-2 space-y-2">
                    {modelResult.imageUrls.slice(1).map((url, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={url} 
                          alt={`AI-generated image variant ${index + 2}`}
                          className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80"
                          loading="lazy"
                          onClick={() => openImageInNewTab(url)}
                          onError={(e) => {
                            e.currentTarget.alt = 'Failed to load image variant'
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-white hover:text-pink-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                openImageInNewTab(url)
                              }}
                            >
                              <Expand className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-white hover:text-green-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNavigateToEditor(url, `${model.name} Variant ${index + 2}`)
                              }}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <DownloadImageButton
                              imageUrl={url}
                              generator="social-media"
                              modelName={getStandardModelName(model.id)}
                              fileName={`social_media_${model.name.toLowerCase().replace(/\s+/g, '_')}_variant_${index + 2}`}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-white hover:text-orange-200"
                            >
                              <Download className="w-3 h-3" />
                            </DownloadImageButton>
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <SaveImageButton
                            imageUrl={url}
                            generator="social-media"
                            modelName={`${model.name} Variant ${index + 2}`}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-white hover:text-blue-200"
                            disabled={!isAuthenticated}
                          />
                        </div>
                      </div>
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
  )
}