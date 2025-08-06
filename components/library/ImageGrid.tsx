'use client'

import { Expand, X } from 'lucide-react'

interface Image {
  id: string
  name: string
  url: string
  alt: string
  generatedDate: string
}

interface Campaign {
  name: string
  images: Image[]
}

interface ImageGridProps {
  campaigns: Campaign[]
  selectMode: boolean
  selectedImages: string[]
  setSelectedImages: (images: string[]) => void
  setSelectedImageForPreview: (image: Image | null) => void
}

export default function ImageGrid({
  campaigns,
  selectMode,
  selectedImages,
  setSelectedImages,
  setSelectedImageForPreview,
}: ImageGridProps) {
  return (
    <div className="flex-1 p-6 overflow-auto">
      {campaigns.map((campaign) => (
        <div key={campaign.name} className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{campaign.name}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {campaign.images.map((image) => (
              <div
                key={image.id}
                className={`group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                  selectMode ? "cursor-pointer" : ""
                } ${selectMode && selectedImages.includes(image.id) ? "ring-2 ring-pink-500" : ""}`}
                onClick={() => {
                  if (selectMode) {
                    if (selectedImages.includes(image.id)) {
                      setSelectedImages(selectedImages.filter((id) => id !== image.id))
                    } else {
                      setSelectedImages([...selectedImages, image.id])
                    }
                  }
                }}
              >
                {/* Checkbox for select mode */}
                {selectMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => {}} // Handled by parent onClick
                      className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500 pointer-events-none"
                    />
                  </div>
                )}

                {/* Image Thumbnail */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  <img
                    src={image.url || "/placeholder.svg"}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />

                  {/* Expand Icon - only show when not in select mode */}
                  {!selectMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedImageForPreview(image)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
                    >
                      <Expand className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Image Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{image.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{image.generatedDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}