'use client'

import { useState, useCallback } from 'react'
import OptimizedDatabaseImageGrid from './OptimizedDatabaseImageGrid'
import ImagePreviewModal from './ImagePreviewModal'
import { Button } from '@/components/ui/button'
import { Upload, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface EnhancedLibraryProps {
  isPublic?: boolean
}

export default function EnhancedLibrary({ isPublic = false }: EnhancedLibraryProps) {
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<any>(null)

  const handleImageClick = useCallback((image: any) => {
    setSelectedImageForPreview(image)
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Egress-Optimized Database Image Grid with built-in search and filters */}
      <OptimizedDatabaseImageGrid 
        isPublic={isPublic}
        onImageClick={handleImageClick}
      />

      {/* Floating Action Buttons */}
      {!isPublic && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3">
          <Link href="/generator">
            <Button 
              size="lg"
              className="rounded-full shadow-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Generate New
            </Button>
          </Link>
          {/* Upload button disabled */}
          {/* <Link href="/upload">
            <Button 
              size="lg"
              variant="outline"
              className="rounded-full shadow-lg bg-white hover:bg-gray-50"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Images
            </Button>
          </Link> */}
        </div>
      )}

      {/* Image Preview Modal - Optimized for Calendar Events */}
      {selectedImageForPreview && (
        <ImagePreviewModal
          image={{
            id: selectedImageForPreview.id,
            url: selectedImageForPreview.storage_url || '/placeholder-image.png',
            title: selectedImageForPreview.title,
            alt: selectedImageForPreview.title,
            generatedDate: new Date(selectedImageForPreview.created_at).toLocaleDateString(),
            model: selectedImageForPreview.model_name || 'Calendar Event',
            filename: 'calendar-event',
            tags: selectedImageForPreview.tags || [],
            description: selectedImageForPreview.description || `Event from ${selectedImageForPreview.generation_metadata?.region || 'Unknown Region'}`,
            agentResult: selectedImageForPreview.generation_metadata?.agentResult || {
              style: 'calendar-event',
              variant: {
                prompt: `Calendar event: ${selectedImageForPreview.title}`,
                Image_title: selectedImageForPreview.title,
                Image_description: selectedImageForPreview.description || '',
                prompt_success: selectedImageForPreview.generation_status === 'completed'
              }
            },
            source: selectedImageForPreview.generation_source || 'calendar',
            trigger: selectedImageForPreview.generation_trigger || 'calendar-event',
            generationMetadata: selectedImageForPreview.generation_metadata || {}
          }}
          onClose={() => setSelectedImageForPreview(null)}
        />
      )}
    </div>
  )
}