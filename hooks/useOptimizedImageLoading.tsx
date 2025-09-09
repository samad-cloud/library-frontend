import { useState, useEffect, useRef, useCallback } from 'react'

interface ImageLoadingOptions {
  thumbnailUrl?: string | null
  fullUrl: string
  blurhash?: string | null
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

export function useOptimizedImageLoading({
  thumbnailUrl,
  fullUrl,
  blurhash,
  priority = false,
  onLoad,
  onError
}: ImageLoadingOptions) {
  const [imageUrl, setImageUrl] = useState(thumbnailUrl || fullUrl)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Preload image for better performance
  const preloadImage = useCallback((url: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.src = url
      
      // Track loading progress if possible
      if ('decode' in img) {
        img.decode()
          .then(() => {
            setLoadingProgress(100)
            resolve()
          })
          .catch(reject)
      } else {
        img.onload = () => {
          setLoadingProgress(100)
          resolve()
        }
        img.onerror = reject
      }
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      try {
        // First try to load thumbnail if available
        if (thumbnailUrl && thumbnailUrl !== fullUrl) {
          setImageUrl(thumbnailUrl)
          await preloadImage(thumbnailUrl)
          
          if (!isMounted) return
          
          // Then load full image in background
          if (priority) {
            await preloadImage(fullUrl)
            if (isMounted) {
              setImageUrl(fullUrl)
            }
          }
        } else {
          // Direct load if no thumbnail
          await preloadImage(fullUrl)
        }

        if (isMounted) {
          setIsLoading(false)
          setError(false)
          onLoad?.()
        }
      } catch (err) {
        if (isMounted) {
          setIsLoading(false)
          setError(true)
          onError?.()
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [fullUrl, thumbnailUrl, priority, preloadImage, onLoad, onError])

  return {
    imageUrl,
    isLoading,
    error,
    loadingProgress,
    imageRef
  }
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
      if (entry.isIntersecting) {
        setHasIntersected(true)
      }
    }, {
      threshold: 0,
      rootMargin: '50px',
      ...options
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, options.threshold, options.rootMargin])

  return { isIntersecting, hasIntersected }
}

// Hook for image preloading queue
export function useImagePreloadQueue(urls: string[], maxConcurrent: number = 3) {
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const queueRef = useRef<string[]>([])
  const activeLoadsRef = useRef<number>(0)

  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = url
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Failed to load ${url}`))
    })
  }, [])

  const processQueue = useCallback(async () => {
    while (queueRef.current.length > 0 && activeLoadsRef.current < maxConcurrent) {
      const url = queueRef.current.shift()
      if (!url || loadedUrls.has(url)) continue

      activeLoadsRef.current++
      
      try {
        await preloadImage(url)
        setLoadedUrls(prev => new Set(prev).add(url))
      } catch (error) {
        console.error('Failed to preload image:', url)
      } finally {
        activeLoadsRef.current--
      }
    }

    if (queueRef.current.length === 0 && activeLoadsRef.current === 0) {
      setLoading(false)
    }
  }, [loadedUrls, maxConcurrent, preloadImage])

  useEffect(() => {
    queueRef.current = urls.filter(url => !loadedUrls.has(url))
    
    if (queueRef.current.length > 0) {
      setLoading(true)
      processQueue()
    }
  }, [urls, processQueue])

  return { loadedUrls, loading }
}

// Performance monitoring hook
export function useImageLoadPerformance() {
  const startTimeRef = useRef<number>(Date.now())
  const [metrics, setMetrics] = useState({
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    averageLoadTime: 0,
    totalLoadTime: 0
  })

  const trackImageLoad = useCallback((success: boolean = true) => {
    const loadTime = Date.now() - startTimeRef.current
    
    setMetrics(prev => {
      const newLoadedImages = success ? prev.loadedImages + 1 : prev.loadedImages
      const newFailedImages = success ? prev.failedImages : prev.failedImages + 1
      const newTotalImages = prev.totalImages + 1
      const newTotalLoadTime = prev.totalLoadTime + loadTime
      const newAverageLoadTime = newTotalLoadTime / newTotalImages

      return {
        totalImages: newTotalImages,
        loadedImages: newLoadedImages,
        failedImages: newFailedImages,
        averageLoadTime: Math.round(newAverageLoadTime),
        totalLoadTime: newTotalLoadTime
      }
    })
  }, [])

  const resetMetrics = useCallback(() => {
    startTimeRef.current = Date.now()
    setMetrics({
      totalImages: 0,
      loadedImages: 0,
      failedImages: 0,
      averageLoadTime: 0,
      totalLoadTime: 0
    })
  }, [])

  return { metrics, trackImageLoad, resetMetrics }
}