'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase-singleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Filter, Grid, List, Download, Tag as TagIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Optimized image interface - minimal data for thumbnail view
interface OptimizedDatabaseImage {
  id: string
  title: string
  description: string | null
  generation_source: string
  created_at: string
  model_name: string
  style_type: string | null
  thumb_url: string | null
  storage_url: string
  tags: string[]
  width: number | null
  height: number | null
}

// Cache structure for page-based pagination
interface CacheEntry {
  data: OptimizedDatabaseImage[]
  timestamp: number
  totalCount: number
  totalPages: number
  page: number
}

// Request deduplication
interface RequestState {
  isLoading: boolean
  promise?: Promise<any>
}

interface OptimizedDatabaseImageGridProps {
  isPublic?: boolean
  onImageClick?: (image: any) => void
}

export default function OptimizedDatabaseImageGrid({ isPublic = false, onImageClick }: OptimizedDatabaseImageGridProps) {
  const [images, setImages] = useState<OptimizedDatabaseImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('') // Local state for input
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'model'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Page-based pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  
  // Enhanced cache and optimization
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map())
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [requestState, setRequestState] = useState<RequestState>({ isLoading: false })
  
  // Optimized constants
  const IMAGES_PER_PAGE = 12 // Optimal balance between UX and egress
  const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes cache
  const DEBOUNCE_DELAY = 800 // Longer delay for better UX
  
  const supabase = getSupabaseClient()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate cache key for current filters and page
  const getCacheKey = useCallback((page: number) => {
    return `${searchTerm}-${selectedModel}-${selectedSource}-${selectedAspectRatio}-${sortBy}-${sortOrder}-page-${page}`
  }, [searchTerm, selectedModel, selectedSource, selectedAspectRatio, sortBy, sortOrder])

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry: CacheEntry) => {
    return Date.now() - entry.timestamp < CACHE_DURATION
  }, [])

  // Optimized fetch with page-based loading
  const fetchPage = useCallback(async (page: number) => {
    const cacheKey = getCacheKey(page)
    
    // Request deduplication
    if (requestState.isLoading) {
      if (requestState.promise) {
        return requestState.promise
      }
      return
    }

    // Return cached data if valid
    const cachedEntry = cache.get(cacheKey)
    if (cachedEntry && isCacheValid(cachedEntry)) {
      setImages(cachedEntry.data)
      setTotalCount(cachedEntry.totalCount)
      setTotalPages(cachedEntry.totalPages)
      setLastFetchTime(cachedEntry.timestamp)
      setLoading(false)
      setIsLoadingPage(false)
      return
    }

    const fetchPromise = (async () => {
      try {
        if (page === 1) {
          setLoading(true)
          setError(null)
        } else {
          setIsLoadingPage(true)
        }

        const offset = (page - 1) * IMAGES_PER_PAGE

        // Single optimized query with count - minimal data transfer
        let query = supabase
          .from('images')
          .select('id, title, description, generation_source, created_at, model_name, style_type, thumb_url, storage_url, width, height', { count: 'exact' })
          .range(offset, offset + IMAGES_PER_PAGE - 1)

        // Apply filters efficiently
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        }
        if (selectedModel) {
          query = query.eq('model_name', selectedModel)
        }
        if (selectedSource) {
          query = query.eq('generation_source', selectedSource)
        }

        // Apply sorting
        if (sortBy === 'date') {
          query = query.order('created_at', { ascending: sortOrder === 'asc' })
        } else if (sortBy === 'model') {
          query = query.order('model_name', { ascending: sortOrder === 'asc' })
          query = query.order('created_at', { ascending: sortOrder === 'asc' })
        }

        const { data, error, count } = await query

        if (error) {
          throw new Error(`Database error: ${error.message}`)
        }

        // Transform to optimized format with minimal processing
        let optimizedImages: OptimizedDatabaseImage[] = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title || 'Untitled',
          description: row.description,
          generation_source: row.generation_source || 'manual',
          created_at: row.created_at,
          model_name: row.model_name || 'unknown',
          style_type: row.style_type,
          thumb_url: row.thumb_url,
          storage_url: row.storage_url,
          tags: row.tags,
          width: row.width,
          height: row.height
        }))

        // Apply client-side aspect ratio filtering
        if (selectedAspectRatio) {
          optimizedImages = optimizedImages.filter(image => {
            const imageAspectRatio = getAspectRatioCategory(image.width, image.height)
            return imageAspectRatio === selectedAspectRatio
          })
        }

        // Adjust count based on client-side filtering
        const actualCount = selectedAspectRatio ? optimizedImages.length : (count || 0)
        const totalCount = actualCount
        const totalPages = Math.ceil(totalCount / IMAGES_PER_PAGE)

        // Update cache efficiently
        const cacheEntry: CacheEntry = {
          data: optimizedImages,
          timestamp: Date.now(),
          totalCount,
          totalPages,
          page
        }
        
        setCache(prev => {
          const newCache = new Map(prev)
          newCache.set(cacheKey, cacheEntry)
          // Efficient cache management - keep more pages cached
          if (newCache.size > 30) {
            const oldestKey = Array.from(newCache.entries())
              .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0]
            newCache.delete(oldestKey)
          }
          return newCache
        })

        // Update state
        setTotalCount(totalCount)
        setTotalPages(totalPages)
        setImages(optimizedImages)
        setLastFetchTime(Date.now())
        
      } catch (error) {
        console.error('Error fetching page:', error)
        setError(error instanceof Error ? error.message : 'Failed to load images')
      } finally {
        setLoading(false)
        setIsLoadingPage(false)
      }
    })()

    setRequestState({ isLoading: true, promise: fetchPromise })
    await fetchPromise
    setRequestState({ isLoading: false })
    
    return fetchPromise
  }, [searchTerm, selectedModel, selectedSource, selectedAspectRatio, sortBy, sortOrder, cache, isCacheValid, requestState.isLoading, requestState.promise])

  // Handle search input changes with debouncing
  const handleSearchInputChange = useCallback((inputValue: string) => {
    setSearchInput(inputValue)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(inputValue)
    }, DEBOUNCE_DELAY)
  }, [])

  // Handle page navigation
  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage && !requestState.isLoading && !isLoadingPage) {
      setCurrentPage(page)
      fetchPage(page)
    }
  }, [currentPage, requestState.isLoading, isLoadingPage]) // Removed fetchPage dependency

  // Initial load effect - load first page only
  useEffect(() => {
    fetchPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty - run only on mount

  // Handle actual search term changes (after debounce)
  useEffect(() => {
    if (searchTerm !== searchInput) {
      // Update input to match if they're out of sync
      setSearchInput(searchTerm)
    }
    
    // Reset to page 1 and fetch when search term changes
    setCurrentPage(1)
    setImages([])
    setTotalPages(0)
    setError(null)
    fetchPage(1)
  }, [searchTerm]) // Removed fetchPage dependency

  // Handle filter changes (non-search) - immediate effect  
  useEffect(() => {
    // Reset state when filters change
    setImages([])
    setCurrentPage(1)
    setTotalPages(0) 
    setError(null)
    
    // Fetch with current search term
    fetchPage(1)
  }, [selectedModel, selectedSource, selectedAspectRatio, sortBy, sortOrder]) // Removed fetchPage dependency


  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleImageClick = (image: OptimizedDatabaseImage) => {
    if (onImageClick) {
      // Transform the optimized image to match the expected format
      const transformedImage = {
        id: image.id,
        storage_url: image.storage_url,
        title: image.title,
        description: image.description,
        tags: image.tags,
        model_name: image.model_name,
        generation_source: image.generation_source,
        created_at: image.created_at,
        generation_status: 'completed',
        generation_metadata: {
          style_type: image.style_type
        }
      }
      onImageClick(transformedImage)
    } else {
      console.log('Image clicked:', image.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatModelName = (modelName: string) => {
    const modelDisplayMap: { [key: string]: string } = {
      'imagen-4.0-generate-preview-06-06': 'Imagen 4',
      'imagen-3.0-generate-002': 'Imagen 3',
      'gemini-2.5-flash-image-preview': 'Gemini Flash',
      'gpt-image-1': 'DALL-E'
    }
    return modelDisplayMap[modelName] || modelName
  }

  // Helper function to calculate aspect ratio category
  const getAspectRatioCategory = (width: number | null, height: number | null): string | null => {
    if (!width || !height) return null
    
    const ratio = width / height
    const tolerance = 0.1 // Allow some tolerance for aspect ratio matching
    
    // Check against standard aspect ratios
    if (Math.abs(ratio - 1) < tolerance) return '1:1'      // Square
    if (Math.abs(ratio - 4/3) < tolerance) return '4:3'    // Traditional
    if (Math.abs(ratio - 16/9) < tolerance) return '16:9'  // Widescreen
    if (Math.abs(ratio - 9/16) < tolerance) return '9:16'  // Vertical/Mobile
    if (Math.abs(ratio - 3/4) < tolerance) return '3:4'    // Portrait
    
    return null // Unknown aspect ratio
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading optimized images...</p>
        </div>
      </div>
    )
  }

  if (error && images.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Images</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => {
            setError(null)
            setLoading(true)
            fetchPage(currentPage)
          }}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 p-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search images..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedModel || "all"} onValueChange={(value) => setSelectedModel(value === "all" ? "" : value)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="imagen-4.0-generate-preview-06-06">Imagen 4</SelectItem>
                <SelectItem value="imagen-3.0-generate-002">Imagen 3</SelectItem>
                <SelectItem value="gemini-2.5-flash-image-preview">Gemini Flash</SelectItem>
                <SelectItem value="gpt-image-1">DALL-E</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSource || "all"} onValueChange={(value) => setSelectedSource(value === "all" ? "" : value)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedAspectRatio || "all"} onValueChange={(value) => setSelectedAspectRatio(value === "all" ? "" : value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Ratios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratios</SelectItem>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
                <SelectItem value="4:3">Standard (4:3)</SelectItem>
                <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                <SelectItem value="3:4">Tall (3:4)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: 'date' | 'model') => setSortBy(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="model">Sort by Model</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {((currentPage - 1) * IMAGES_PER_PAGE) + 1}-{Math.min(currentPage * IMAGES_PER_PAGE, totalCount)} of {totalCount} results
          {totalPages > 1 && (
            <span className="ml-2 text-gray-500">
              (Page {currentPage} of {totalPages})
            </span>
          )}
          {lastFetchTime > 0 && (
            <span className="ml-2 text-green-600">
              (Cached: {Math.round((Date.now() - lastFetchTime) / 1000)}s ago)
            </span>
          )}
        </p>
      </div>

      {/* Optimized Image Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <Card 
            key={`${image.id}-${index}`}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleImageClick(image)}
          >
            <CardContent className="p-3">
              {/* Optimized image with proper lazy loading */}
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 overflow-hidden">
                {image.thumb_url || image.storage_url ? (
                  <img
                    src={image.thumb_url || image.storage_url}
                    alt={image.title}
                    className="w-full h-full object-cover transition-opacity duration-200"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      // Fallback to storage_url if thumb_url fails
                      const target = e.target as HTMLImageElement
                      if (image.thumb_url && target.src === image.thumb_url) {
                        target.src = image.storage_url
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Image metadata */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm line-clamp-2">{image.title}</h3>
                
                {image.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{image.description}</p>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="truncate">{formatModelName(image.model_name)}</span>
                  <span>{formatDate(image.created_at)}</span>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {image.generation_source}
                    </Badge>
                  </div>
                  
                  {/* Image dimensions and MP as tags on the right */}
                  {(image.width && image.height) && (
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs text-gray-600">
                        {image.width} × {image.height}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-gray-600">
                        {(image.width * image.height / 1000000).toFixed(1)}MP
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoadingPage}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Show first page */}
            {currentPage > 3 && (
              <>
                <Button
                  variant={1 === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={isLoadingPage}
                >
                  1
                </Button>
                {currentPage > 4 && <span className="px-2">...</span>}
              </>
            )}
            
            {/* Show pages around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              if (page > totalPages) return null
              
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  disabled={isLoadingPage}
                >
                  {page}
                </Button>
              )
            }).filter(Boolean)}
            
            {/* Show last page */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                <Button
                  variant={totalPages === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={isLoadingPage}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoadingPage}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          {isLoadingPage && (
            <div className="flex items-center ml-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Loading...</span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && images.length === 0 && (
        <div className="text-center py-12">
          <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}
