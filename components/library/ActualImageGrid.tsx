'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import ImagePreviewModal from './ImagePreviewModal'
import OptimizedImage from './OptimizedImage'

interface DatabaseImage {
  id: string
  storage_url: string
  title: string
  description: string | null
  tags: string[]
  style_type: string | null
  prompt_used: string | null
  model_name: string
  generation_source: 'calendar' | 'manual' | 'api' | 'csv'
  format: string | null
  generation_id: string | null
  generation_metadata: any
  manual_request_data: any
  created_at: string
  // Joined from image_generations
  generation_trigger?: string
  generation_persona?: string
  generation_products?: any
  generation_status?: string
  generation_completed_at?: string
}

interface GenerationGroup {
  generation_id: string | null
  trigger: string
  source: string
  status: string
  created_at: string
  all_tags: string[]
  images: DatabaseImage[]
}

interface ActualImageGridProps {
  isPublic?: boolean
}

export default function ActualImageGrid({ isPublic = false }: ActualImageGridProps) {
  const [generationGroups, setGenerationGroups] = useState<GenerationGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<DatabaseImage | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [showAllTags, setShowAllTags] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'source' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [imageLoadStats, setImageLoadStats] = useState<{
    totalImages: number
    loadedImages: number
    startTime: number | null
  }>({ totalImages: 0, loadedImages: 0, startTime: null })
  
  // Infinite scroll and pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalGroupCount, setTotalGroupCount] = useState(0)
  const [usePagination, setUsePagination] = useState(false)
  
  // Configuration
  const GROUPS_PER_PAGE = 20
  const INFINITE_SCROLL_LIMIT = 40 // After 40 groups, switch to pagination
  
  const supabase = createClient()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch all unique tags and sources for filtering
  const fetchAllFilterOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('tags, generation_source')
        .not('tags', 'is', null)

      if (error) throw error

      const tags = new Set<string>()
      const sources = new Set<string>()
      
      data?.forEach((item: any) => {
        // Extract tags
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => tags.add(tag))
        }
        
        // Extract sources
        if (item.generation_source) {
          sources.add(item.generation_source)
        }
      })

      setAllTags(Array.from(tags).sort())
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  // Group images by generation_id and create GenerationGroup objects
  const groupImagesByGeneration = (images: DatabaseImage[]): GenerationGroup[] => {
    const grouped = new Map<string, GenerationGroup>()
    
    images.forEach(image => {
      const key = image.generation_id || `no-generation-${image.id}`
      
      if (!grouped.has(key)) {
        // Create new group
        const group: GenerationGroup = {
          generation_id: image.generation_id,
          trigger: image.generation_trigger || image.title || 'Unknown Generation',
          source: image.generation_source,
          status: image.generation_status || 'completed',
          created_at: image.created_at,
          all_tags: [],
          images: []
        }
        grouped.set(key, group)
      }
      
      const group = grouped.get(key)!
      group.images.push(image)
      
      // Collect all tags from this generation
      if (image.tags) {
        image.tags.forEach(tag => {
          if (!group.all_tags.includes(tag)) {
            group.all_tags.push(tag)
          }
        })
      }
    })
    
    // Sort images within each group by style_type and creation date
    Array.from(grouped.values()).forEach(group => {
      group.images.sort((a, b) => {
        // First sort by style_type
        if (a.style_type && b.style_type && a.style_type !== b.style_type) {
          return a.style_type.localeCompare(b.style_type)
        }
        // Then by creation date
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      
      // Sort tags alphabetically
      group.all_tags.sort()
    })
    
    return Array.from(grouped.values())
  }

  // Fetch images with filters and pagination, then group by generation
  const fetchImages = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true)
        setCurrentPage(1)
        setHasMoreData(true)
        setUsePagination(false)
      } else {
        setIsLoadingMore(true)
      }
      
      console.log('🔍 Starting image fetch...', { page, append })
      console.log('Filters:', { searchTerm, selectedSource, selectedStatus, selectedTags, sortBy, sortOrder })
      
      // For speed, we'll fetch larger batches and do grouping on client side
      const batchSize = append ? GROUPS_PER_PAGE * 10 : GROUPS_PER_PAGE * 15 // Fetch more images to ensure we get enough groups
      const offset = (page - 1) * batchSize
      
      // Main query with joins to get generation data - optimized for speed
      let query = supabase
        .from('images')
        .select(`
          id,
          storage_url,
          title,
          description,
          tags,
          style_type,
          prompt_used,
          model_name,
          generation_source,
          generation_id,
          created_at,
          image_generations!inner(
            trigger,
            status,
            completed_at
          )
        `)
        .range(offset, offset + batchSize - 1)

      // Apply search filter - search in trigger from image_generations table
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,prompt_used.ilike.%${searchTerm}%,image_generations.trigger.ilike.%${searchTerm}%`)
      }

      // Apply source filter
      if (selectedSource) {
        query = query.eq('generation_source', selectedSource)
      }

      // Apply status filter (from image_generations)
      if (selectedStatus) {
        query = query.eq('image_generations.status', selectedStatus)
      }

      // Apply sorting - sort by generation creation date for grouping efficiency
      if (sortBy === 'date') {
        query = query.order('created_at', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'source') {
        query = query.order('generation_source', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'status') {
        query = query.order('image_generations.status', { ascending: sortOrder === 'asc' })
      }

      console.log('📡 Executing Supabase query...')
      const { data, error } = await query

      if (error) {
        console.error('❌ Supabase query error:', error)
        throw error
      }

      console.log('✅ Raw query result:', data?.length || 0, 'images')

      // Process the joined data to flatten the structure
      let images = (data || []).map((item: any) => ({
        ...item,
        generation_trigger: item.image_generations?.trigger,
        generation_status: item.image_generations?.status,
        generation_completed_at: item.image_generations?.completed_at
      })) as DatabaseImage[]

      // Client-side tag filtering (since we're using array contains)
      if (selectedTags.length > 0) {
        console.log('🏷️ Applying tag filter:', selectedTags)
        images = images.filter(image => {
          const imageTags = image.tags || []
          return selectedTags.every(tag => imageTags.includes(tag))
        })
        console.log('📊 After tag filtering:', images.length)
      }

      // Group images by generation_id
      const newGroups = groupImagesByGeneration(images)
      console.log('🎯 Grouped into:', newGroups.length, 'generation groups')
      
      // Calculate total images for performance tracking
      const totalImages = newGroups.reduce((acc, group) => acc + group.images.length, 0)
      
      // Sort groups by their creation date
      newGroups.sort((a, b) => {
        if (sortOrder === 'asc') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        } else {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
      })
      
      // For pagination, we need to limit the number of groups shown
      const groupsToShow = newGroups.slice(0, GROUPS_PER_PAGE)
      const hasMore = newGroups.length >= GROUPS_PER_PAGE
      
      // Determine if we should use pagination after this load
      const currentTotalGroups = append ? generationGroups.length + groupsToShow.length : groupsToShow.length
      const shouldUsePagination = currentTotalGroups >= INFINITE_SCROLL_LIMIT

      setUsePagination(shouldUsePagination)
      setHasMoreData(hasMore && !shouldUsePagination)
      setTotalGroupCount(newGroups.length)
      
      if (append) {
        setGenerationGroups(prev => [...prev, ...groupsToShow])
        setCurrentPage(page)
      } else {
        setGenerationGroups(groupsToShow)
        setImageLoadStats({
          totalImages,
          loadedImages: 0,
          startTime: Date.now()
        })
      }
      
    } catch (error) {
      console.error('❌ Error fetching images:', error)
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [searchTerm, selectedSource, selectedStatus, selectedTags, sortBy, sortOrder, generationGroups.length, GROUPS_PER_PAGE, INFINITE_SCROLL_LIMIT, supabase])

  // Load more images for infinite scroll
  const loadMoreImages = useCallback(async () => {
    if (!hasMoreData || isLoadingMore || usePagination) return
    
    const nextPage = currentPage + 1
    await fetchImages(nextPage, true)
  }, [currentPage, hasMoreData, isLoadingMore, usePagination, fetchImages])

  // Infinite scroll intersection observer
  useEffect(() => {
    if (!loadMoreRef.current || usePagination || !hasMoreData) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreImages()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loadMoreImages, usePagination, hasMoreData])

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page)
    fetchImages(page, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) goToPage(currentPage - 1)
  }

  const goToNextPage = () => {
    const totalPages = Math.ceil(totalGroupCount / GROUPS_PER_PAGE)
    if (currentPage < totalPages) goToPage(currentPage + 1)
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

  const handleSortChange = (newSortBy: 'date' | 'source' | 'status') => {
    if (sortBy === newSortBy) {
      // Toggle order if same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with default order
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  const handleSourceChange = (source: string) => {
    setSelectedSource(source)
  }

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status)
  }

  // Initial load
  useEffect(() => {
    fetchAllFilterOptions()
  }, [])

  useEffect(() => {
    fetchImages(1, false) // Reset to first page when filters change
  }, [searchTerm, selectedTags, selectedSource, selectedStatus, sortBy, sortOrder])

  // Track image load performance
  const handleImageLoad = () => {
    setImageLoadStats(prev => {
      const newLoadedCount = prev.loadedImages + 1
      const isComplete = newLoadedCount === prev.totalImages
      
      if (isComplete && prev.startTime) {
        const loadTime = Date.now() - prev.startTime
        console.log(`📈 Performance: ${newLoadedCount} images loaded in ${loadTime}ms (${(loadTime/newLoadedCount).toFixed(1)}ms avg per image)`)
      }
      
      return {
        ...prev,
        loadedImages: newLoadedCount
      }
    })
  }

  // Get source badge style
  const getSourceBadgeStyle = (source: string) => {
    switch (source) {
      case 'csv':
        return 'bg-blue-500 text-white'
      case 'calendar':
        return 'bg-green-500 text-white'
      case 'manual':
        return 'bg-purple-500 text-white'
      case 'api':
        return 'bg-orange-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  // Get model badge style
  const getModelBadgeStyle = (model: string) => {
    switch (model) {
      case 'gpt-image-1':
        return 'bg-pink-500 text-white'
      case 'imagen-4.0-preview':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  // Check if any prompt generation failed
  const hasGenerationFailed = (group: GenerationGroup): boolean => {
    return group.status === 'failed'
  }

  // Render individual image
  const renderImage = (image: DatabaseImage, idxKey: string) => {
    const modelLabel = image.model_name === 'gpt-image-1' ? 'DALL-E' : 'Imagen'
    return (
      <div 
        key={idxKey}
        className="aspect-square bg-gray-100 relative overflow-hidden rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => {
          console.log('Image clicked:', image)
          setSelectedImage(image)
        }}
      >
        <OptimizedImage
          src={image.storage_url}
          alt={image.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onLoad={handleImageLoad}
          onError={(e) => {
            console.error('Image failed to load:', image.storage_url)
            e.currentTarget.src = '/placeholder.svg'
          }}
        />
        
        {/* Model badge */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
          {modelLabel}
        </div>
        
        {/* Status badge */}
        {image.generation_status === 'completed' && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded z-10">
            Complete
          </div>
        )}

        {/* Style badge (bottom) */}
        {image.style_type && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
            {image.style_type}
          </div>
        )}
      </div>
    )
  }

  // Render generation group (similar to image row in DatabaseImageGrid)
  const renderGenerationGroup = (group: GenerationGroup) => {
    const generationFailed = hasGenerationFailed(group)
    
    // Limit images shown to first 6 for speed
    const imagesToShow = group.images.slice(0, 6)
    
    return (
      <div key={group.generation_id || 'no-gen'} className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {/* Header with trigger and source */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-gray-900 flex-1 line-clamp-2">
              {group.trigger}
            </h3>
            <div className={`ml-3 text-xs px-2 py-1 rounded ${getSourceBadgeStyle(group.source)}`}>
              {group.source.toUpperCase()}
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-2">
            {group.all_tags.slice(0, 5).map((tag, tagIndex) => (
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
            {group.all_tags.length > 5 && (
              <span className="px-2 py-1 bg-gray-100 text-xs text-gray-500 rounded">
                +{group.all_tags.length - 5}
              </span>
            )}
          </div>
          
          {/* Date and status */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{new Date(group.created_at).toLocaleDateString()}</span>
            <span className={`px-2 py-1 rounded ${group.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {group.status}
            </span>
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
                  <div className="text-sm text-red-700">
                    Generation failed for trigger: {group.trigger}
                  </div>
                </div>
              </div>
            </div>
          ) : imagesToShow.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {imagesToShow.map((img, idx) => 
                renderImage(img, `${group.generation_id}-${idx}`)
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No images available
            </div>
          )}
          
          {/* Show "more images" indicator if there are more than 6 */}
          {group.images.length > 6 && (
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500">
                +{group.images.length - 6} more images in this generation
              </span>
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
              placeholder="Search by title, description, or prompt..."
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
              <button
                onClick={() => handleSortChange('source')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'source'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Source {sortBy === 'source' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('status')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'status'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Source:</span>
              <select
                value={selectedSource}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">All Sources</option>
                <option value="csv">CSV Upload</option>
                <option value="calendar">Calendar Events</option>
                <option value="manual">Manual Generation</option>
                <option value="api">API Generation</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
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

      {/* Generation Groups */}
      <div className="flex-1 p-6">
        {generationGroups.length === 0 && !loading ? (
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
                    setSelectedSource('')
                    setSelectedStatus('')
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
            {generationGroups.map((group) => renderGenerationGroup(group))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        {!loading && !usePagination && hasMoreData && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isLoadingMore && (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                <span className="text-gray-600">Loading more images...</span>
              </div>
            )}
          </div>
        )}

        {/* Pagination UI (appears after scroll limit) */}
        {!loading && usePagination && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-800 mb-2">
                  📄 You've reached the infinite scroll limit ({INFINITE_SCROLL_LIMIT} generation groups)
                </p>
                <p className="text-xs text-blue-600">
                  Use pagination below to continue browsing
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {Math.ceil(totalGroupCount / GROUPS_PER_PAGE)}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({totalGroupCount} total generation groups)
                  </span>
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= Math.ceil(totalGroupCount / GROUPS_PER_PAGE)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>

              {/* Page number input for direct navigation */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Go to page:</span>
                <input
                  type="number"
                  min="1"
                  max={Math.ceil(totalGroupCount / GROUPS_PER_PAGE)}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value)
                    if (page >= 1 && page <= Math.ceil(totalGroupCount / GROUPS_PER_PAGE)) {
                      goToPage(page)
                    }
                  }}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        )}

        {/* Image loading progress indicator */}
        {!loading && imageLoadStats.totalImages > 0 && imageLoadStats.loadedImages < imageLoadStats.totalImages && (
          <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 border z-50">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-700">
                Loading images: {imageLoadStats.loadedImages}/{imageLoadStats.totalImages}
              </span>
            </div>
            <div className="mt-2 w-48 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(imageLoadStats.loadedImages / imageLoadStats.totalImages) * 100}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <ImagePreviewModal
          image={{
            id: selectedImage.id,
            url: selectedImage.storage_url,
            title: selectedImage.title,
            alt: selectedImage.title,
            generatedDate: new Date(selectedImage.created_at).toLocaleDateString(),
            model: selectedImage.model_name,
            filename: selectedImage.storage_url.split('/').pop() || 'unknown',
            tags: selectedImage.tags || [],
            description: selectedImage.description || selectedImage.prompt_used || undefined,
            agentResult: {
              style: selectedImage.style_type || 'unknown',
              variant: {
                prompt: selectedImage.prompt_used || '',
                Image_title: selectedImage.title,
                Image_description: selectedImage.description || '',
                prompt_success: selectedImage.generation_status === 'completed'
              }
            },
            source: selectedImage.generation_source,
            trigger: selectedImage.generation_trigger,
            generationMetadata: selectedImage.generation_metadata
          }}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  )
}
