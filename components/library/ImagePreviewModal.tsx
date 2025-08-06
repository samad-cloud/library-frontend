'use client'

import { X } from 'lucide-react'

interface Image {
  id: string
  name: string
  url: string
  alt: string
  generatedDate: string
}

interface ImagePreviewModalProps {
  image: Image
  onClose: () => void
}

export default function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-full">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <img
          src={image.url || "/placeholder.svg"}
          alt={image.alt}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />

        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
          <h4 className="font-medium">{image.name}</h4>
          <p className="text-sm text-gray-300 mt-1">{image.generatedDate}</p>
        </div>
      </div>
    </div>
  )
}