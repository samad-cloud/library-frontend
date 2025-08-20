'use client'

import { useState } from 'react'
import LibraryHeader from './LibraryHeader'
import ImageGrid from './ImageGrid'
import ImagePreviewModal from './ImagePreviewModal'
import ActualImageGrid from './ActualImageGrid'



interface LibraryProps {
  isPublic?: boolean
}

export default function Library({ isPublic = false }: LibraryProps) {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<any>(null)

  return (
    <div className="flex-1 flex flex-col">
      {/* <LibraryHeader
        selectMode={selectMode}
        setSelectMode={setSelectMode}
        selectedImages={selectedImages}
        isPublic={isPublic}
      /> */}

      {/* Use ActualImageGrid for both public and authenticated users - shows real images from images table */}
      <ActualImageGrid isPublic={isPublic} />
    </div>
  )
}