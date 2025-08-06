'use client'

import { useState } from 'react'
import LibraryHeader from './LibraryHeader'
import ImageGrid from './ImageGrid'
import ImagePreviewModal from './ImagePreviewModal'
import DatabaseImageGrid from './DatabaseImageGrid'

// Sample campaign data
const existingCampaigns = [
  {
    name: "UK Summer Sale",
    images: [
      {
        id: "1",
        name: "Summer Beach Scene",
        url: "/placeholder.svg?height=300&width=300",
        alt: "Summer beach scene",
        generatedDate: "2 days ago",
      },
      {
        id: "2",
        name: "Lifestyle Shot",
        url: "/placeholder.svg?height=300&width=300",
        alt: "Lifestyle product shot",
        generatedDate: "3 days ago",
      },
      // ... more images
    ],
  },
]

interface LibraryProps {
  isPublic?: boolean
}

export default function Library({ isPublic = false }: LibraryProps) {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<any>(null)

  return (
    <div className="flex-1 flex flex-col">
      <LibraryHeader
        selectMode={selectMode}
        setSelectMode={setSelectMode}
        selectedImages={selectedImages}
        isPublic={isPublic}
      />

      {/* Use DatabaseImageGrid for both public and authenticated users */}
      <DatabaseImageGrid isPublic={isPublic} />
    </div>
  )
}