'use client'

import { useState, useEffect, useRef } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  thumbnailSrc?: string
  onLoad?: () => void
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  loading?: 'lazy' | 'eager'
}

export default function OptimizedImage({
  src,
  alt,
  className = '',
  thumbnailSrc,
  onLoad,
  onError,
  loading = 'lazy'
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate thumbnail URL from original URL
  const getThumbnailUrl = (originalUrl: string): string => {
    if (thumbnailSrc) return thumbnailSrc
    
    // If the URL contains query parameters, we can add thumbnail params
    const url = new URL(originalUrl)
    
    // For URLs that support query-based resizing (like many CDNs)
    url.searchParams.set('w', '300') // width
    url.searchParams.set('h', '300') // height
    url.searchParams.set('q', '70')  // quality
    url.searchParams.set('fit', 'crop') // fit mode
    
    return url.toString()
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager') {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { 
        rootMargin: '50px', // Start loading 50px before element comes into view
        threshold: 0.1 
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [loading])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    onError?.(e)
  }

  const thumbnailUrl = getThumbnailUrl(src)

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Thumbnail/Placeholder */}
      {!isLoaded && isInView && (
        <img
          src={thumbnailUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          } filter blur-sm scale-105`}
          style={{ 
            filter: 'blur(2px) brightness(0.9)',
            transform: 'scale(1.05)' // Slight scale to hide blur edges
          }}
        />
      )}

      {/* Full resolution image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${!isLoaded ? 'absolute inset-0' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Failed to load</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!isInView && loading === 'lazy' && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse">
          <div className="w-full h-full bg-gray-200 rounded" />
        </div>
      )}
    </div>
  )
}
