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

      {/* Image Preview Modal - Generic for All Image Types */}
      {selectedImageForPreview && (
        <ImagePreviewModal
          image={{
            id: selectedImageForPreview.id,
            url: selectedImageForPreview.storage_url,
            storage_url: selectedImageForPreview.storage_url,
            title: selectedImageForPreview.title,
            alt: selectedImageForPreview.title || 'Generated image',
            generatedDate: new Date(selectedImageForPreview.created_at).toLocaleDateString(),
            model: selectedImageForPreview.model_name || 'Unknown Model',
            filename: selectedImageForPreview.title,
            tags: selectedImageForPreview.tags || [],
            description: selectedImageForPreview.description,
            agentResult: selectedImageForPreview.generationMetadata?.agentResult,
            source: selectedImageForPreview.generation_source,
            trigger: selectedImageForPreview.generation_trigger,
            generationMetadata: selectedImageForPreview.generationMetadata || {}
          }}
          onClose={() => setSelectedImageForPreview(null)}
        />
      )}
    </div>
  )
}