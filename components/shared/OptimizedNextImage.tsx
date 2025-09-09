'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedNextImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

export default function OptimizedNextImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes,
  quality = 75,
  placeholder,
  blurDataURL,
  onLoad,
  onError,
  objectFit = 'cover'
}: OptimizedNextImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  // Provide comprehensive alt text if not provided
  const enhancedAlt = alt || 'Image'

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100',
          className
        )}
        role="img"
        aria-label={`Failed to load: ${enhancedAlt}`}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="sr-only">Failed to load image</span>
      </div>
    )
  }

  const imageProps = fill
    ? { fill: true, sizes: sizes || '100vw' }
    : { width: width || 400, height: height || 300 }

  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={src}
        alt={enhancedAlt}
        {...imageProps}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          isLoading && 'opacity-0',
          !isLoading && 'opacity-100 transition-opacity duration-300'
        )}
      />
    </div>
  )
}

// Export a simple img fallback for cases where Next.js Image can't be used
export function FallbackImage({
  src,
  alt,
  className,
  onLoad,
  onError
}: {
  src: string
  alt: string
  className?: string
  onLoad?: () => void
  onError?: () => void
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onLoad={onLoad}
      onError={(e) => {
        e.currentTarget.src = '/placeholder.svg'
        e.currentTarget.alt = 'Failed to load image'
        onError?.()
      }}
    />
  )
}