'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import ImagePreviewModal from './ImagePreviewModal'

interface DatabaseImage {
  id: string
  jira_id: string
  summary: string
  description: string | null
  image_urls: string[] | null
  tags: string[] | null
  updated_at: string
  status: string
  region: string | null
  agent_result?: Array<{
    style: string
    variant: {
      prompt: string
      prompt_success: boolean
    }
  }>
  selectedImageUrl?: string
  selectedImageIndex?: number
}

interface DatabaseImageGridProps {
  isPublic?: boolean
}

export default function DatabaseImageGrid({ isPublic = false }: DatabaseImageGridProps) {
  const [images, setImages] = useState<DatabaseImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<DatabaseImage | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [showAllTags, setShowAllTags] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'country'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [allCountries, setAllCountries] = useState<string[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const supabase = createClient()

  // Fetch all unique tags and countries for filtering
  const fetchAllTags = async () => {
    try {
      const { data, error } = await supabase
        .from('test_calendar_events')
        .select('tags, region')
        .not('image_urls', 'is', null)

      if (error) throw error

      const tags = new Set<string>()
      const countries = new Set<string>()
      
      data?.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => tags.add(tag))
        }
        if (item.region) {
          countries.add(item.region)
        }
      })

      setAllTags(Array.from(tags).sort())
      setAllCountries(Array.from(countries).sort())
    } catch (error) {
      console.error('Error fetching tags and countries:', error)
    }
  }

  // Fetch images with filters
  const fetchImages = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('test_calendar_events')
        .select('*')
        .not('image_urls', 'is', null)
        .not('image_urls', 'eq', '{}')
        .limit(50)

      // Apply search filter
      if (searchTerm) {
        query = query.or(`summary.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Apply tag filters
      if (selectedTags.length > 0) {
        query = query.overlaps('tags', selectedTags)
      }

      // Apply country filter
      if (selectedCountry) {
        query = query.eq('region', selectedCountry)
      }

      // Apply sorting
      if (sortBy === 'date') {
        query = query.order('updated_at', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'country') {
        query = query.order('region', { ascending: sortOrder === 'asc' })
      }

      const { data, error } = await query

      if (error) throw error

      setImages(data || [])
    } catch (error) {
      console.error('Error fetching images:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleSortChange = (newSortBy: 'date' | 'country') => {
    if (sortBy === newSortBy) {
      // Toggle order if same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with default order
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
  }

  // Check if any prompt generation failed
  const hasGenerationFailed = (imageData: DatabaseImage): boolean => {
    if (!imageData.agent_result || !Array.isArray(imageData.agent_result)) {
      return false
    }
    return imageData.agent_result.some(result => !result.variant.prompt_success)
  }

  // Get error messages from failed prompts
  const getFailedPromptMessages = (imageData: DatabaseImage): string[] => {
    if (!imageData.agent_result || !Array.isArray(imageData.agent_result)) {
      return []
    }
    return imageData.agent_result
      .filter(result => !result.variant.prompt_success)
      .map(result => `${result.style}: ${result.variant.prompt}`)
  }

  // Initial load
  useEffect(() => {
    fetchAllTags()
  }, [])

  useEffect(() => {
    fetchImages()
  }, [searchTerm, selectedTags, selectedCountry, sortBy, sortOrder])

  // Render individual image
  const renderImage = (imageUrl: string, index: number, imageData: DatabaseImage) => {
    return (
      <div 
        key={`${imageData.id}-${index}`}
        className="aspect-square bg-gray-100 relative overflow-hidden rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setSelectedImage({ ...imageData, selectedImageUrl: imageUrl, selectedImageIndex: index })}
      >
        <img
          src={imageUrl}
          alt={`${imageData.summary} - Image ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {imageData.status === 'completed' && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
            Complete
          </div>
        )}
      </div>
    )
  }

  // Render image row (one database record)
  const renderImageRow = (imageData: DatabaseImage) => {
    const imageUrls = imageData.image_urls || []
    const generationFailed = hasGenerationFailed(imageData)
    const failedMessages = getFailedPromptMessages(imageData)
    
    return (
      <div key={imageData.id} className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {/* Header with summary */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
            {imageData.summary}
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {imageData.tags?.slice(0, 5).map((tag, tagIndex) => (
              <span 
                key={tagIndex} 
                className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleTagToggle(tag)
                }}
              >
                {tag}
              </span>
            ))}
            {imageData.tags && imageData.tags.length > 5 && (
              <span className="px-2 py-1 bg-gray-100 text-xs text-gray-500 rounded">
                +{imageData.tags.length - 5}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(imageData.updated_at).toLocaleDateString()}
          </div>
        </div>

        {/* Content area */}
        <div className="p-4">
          {generationFailed ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Image Generation Failed
                  </h4>
                  <div className="text-sm text-red-700 space-y-1">
                    {failedMessages.map((message, index) => (
                      <div key={index} className="bg-red-100 rounded px-2 py-1">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : imageUrls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imageUrls.slice(0, 3).map((imageUrl, index) => 
                renderImage(imageUrl, index, imageData)
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No images available
            </div>
          )}
        </div>
      </div>
    )
  }

  // Get limited tags for display
  const displayTags = showAllTags ? allTags : allTags.slice(0, 10)

  return (
    <div className="flex-1 flex flex-col">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by summary, description, or tags..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <button
                onClick={() => handleSortChange('date')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'date'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              {/* <button
                onClick={() => handleSortChange('country')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'country'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Country {sortBy === 'country' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button> */}
            </div>

                         {/* Region Filter */}
             {allCountries.length > 0 && (
               <div className="flex items-center gap-2">
                 <span className="text-sm font-medium text-gray-700">Region:</span>
                 <select
                   value={selectedCountry}
                   onChange={(e) => handleCountryChange(e.target.value)}
                   className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                 >
                   <option value="">All Regions</option>
                   {allCountries.map(country => (
                     <option key={country} value={country}>
                       {country}
                     </option>
                   ))}
                 </select>
               </div>
             )}
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by tags:</h3>
              <div className="flex flex-wrap gap-2">
                {displayTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length > 10 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    {showAllTags ? 'Show Less' : `Show ${allTags.length - 10} More`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Rows */}
      <div className="flex-1 p-6">
        {images.length === 0 && !loading ? (
          <div className="text-center py-12">
            {isPublic ? (
              <div>
                <div className="w-16 h-16 bg-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No images available yet</h3>
                <p className="text-gray-500 mb-6">
                  Our AI image generation is working hard to create amazing content. 
                  Check back soon or sign in to create your own images!
                </p>
                <a 
                  href="/auth/login" 
                  className="inline-flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                  Sign In to Create Images
                </a>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-4">No images found matching your criteria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedTags([])
                    setSelectedCountry('')
                    setSortBy('date')
                    setSortOrder('desc')
                  }}
                  className="text-pink-500 hover:text-pink-600 underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {images.map((imageData) => renderImageRow(imageData))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <ImagePreviewModal
          image={{
            id: selectedImage.id,
            name: selectedImage.summary,
            url: selectedImage.selectedImageUrl || selectedImage.image_urls?.[0] || '',
            alt: selectedImage.summary,
            generatedDate: new Date(selectedImage.updated_at).toLocaleDateString(),
          }}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  )
} 