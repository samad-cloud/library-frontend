'use client'

import { X, Download, Share2, Edit3 } from 'lucide-react'
import { navigateToEditor } from '@/lib/editorNavigation'
import { useRouter } from 'next/navigation'
import InstagramPostButton from '@/components/instagram/InstagramPostButton'

interface AgentResult {
  style: string
  variant: {
    prompt: string
    Image_title: string
    Image_description: string
    prompt_success: boolean
  }
}

interface ImagePreviewModalProps {
  image: {
    id: string
    url: string
    title: string
    alt: string
    model?: string
    filename?: string
    generatedDate: string
    tags?: string[]
    description?: string
    agentResult?: AgentResult
    source?: string
    trigger?: string
    storage_url?: string
    generationMetadata?: any
  }
  onClose: () => void
}

export default function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
  const router = useRouter()
  
  if (!image.url) {
    console.error('No image URL provided to modal')
    return null
  }

  // Download handler
  const handleDownload = async () => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = image.filename || `generated-image-${image.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Share handler
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: image.title,
          text: `Check out this AI-generated image: ${image.title}`,
          url: image.url
        })
      } catch (error) {
        console.error('Share failed:', error)
      }
    } else {
      // Fallback - copy image URL to clipboard
      try {
        await navigator.clipboard.writeText(image.url)
        alert('Image URL copied to clipboard!')
      } catch (error) {
        console.error('Copy to clipboard failed:', error)
      }
    }
  }

  // Edit handler - navigate to editor with image
  const handleEdit = async () => {
    if (!image.url) {
      alert('No valid image URL available for editing')
      return
    }
    
    try {
      await navigateToEditor({
        imageUrl: image.url,
        imageName: image.title || 'Library Image',
        router: router
      })
    } catch (error) {
      console.error('Failed to navigate to editor:', error)
      alert('Failed to open editor. Please try again.')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-7xl max-h-[95vh] bg-white rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 h-[80vh] max-h-[80vh]">
          {/* Image display area */}
          <div className="lg:col-span-2 bg-gray-900 flex items-center justify-center p-6 overflow-hidden">
            <img
              src={image.url}
              alt={image.alt}
              className="max-w-full max-h-full object-contain rounded shadow-lg"
              onError={(e) => {
                console.error('Image failed to load:', image.url)
                e.currentTarget.src = '/placeholder.svg'
              }}
              onLoad={() => console.log('Image loaded successfully:', image.url)}
            />
          </div>

          {/* Sidebar with metadata */}
          <div className="lg:col-span-1 bg-gray-50 flex flex-col max-h-[80vh]">
            <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {image.title}
                </h3>
                <p className="text-sm text-gray-500">
                  Generated: {image.generatedDate}
                </p>
              </div>

              {/* Model and filename */}
              <div className="space-y-2">
                {image.model && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Model:</span>
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {image.model === 'gpt-image-1' ? 'GPT Image 1' : 'Imagen 4.0'}
                    </span>
                  </div>
                )}
                {image.filename && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Filename:</span>
                    <p className="text-sm text-gray-800 break-all">{image.filename}</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {image.tags && image.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Result */}
              {image.agentResult && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-800">AI Generation Details</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      image.agentResult.variant.prompt_success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {image.agentResult.variant.prompt_success ? 'Success' : 'Failed'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Style</span>
                      <p className="text-sm text-gray-800 capitalize">{image.agentResult.style}</p>
                    </div>

                    {image.agentResult.variant.Image_title && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Image Title</span>
                        <p className="text-sm text-gray-800 font-medium">{image.agentResult.variant.Image_title}</p>
                      </div>
                    )}

                    {image.agentResult.variant.Image_description && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Image Description</span>
                        <p className="text-sm text-gray-700">{image.agentResult.variant.Image_description}</p>
                      </div>
                    )}

                    {/* <div>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Generation Prompt</span>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{image.agentResult.variant.prompt}</p>
                    </div> */}
                  </div>
                </div>
              )}

              {/* Description fallback */}
              {image.description && !image.agentResult && (
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Description</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{image.description}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-4 mt-6">
                <h4 className="text-sm font-medium text-gray-800 mb-3">Actions</h4>
                <div className="space-y-2">
                  {/* First row - Download and Edit */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg font-medium transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={handleEdit}
                      className="flex items-center justify-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2.5 rounded-lg font-medium transition-colors text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  </div>

                  {/* Second row - Share and Instagram */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg font-medium transition-colors text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    {/* Instagram Post Button */}
                    <InstagramPostButton
                      imageUrl={image.storage_url || image.url}
                      caption={
                        image.generationMetadata?.caption || 
                        `Check out this amazing generated image! ${image.title} #AI #GeneratedArt #Printerpix`
                      }
                      modelName={image.model || 'unknown'}
                      variant="outline"
                      size="sm"
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 h-auto py-2.5"
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}