'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface ProgressiveImageProps {
  fullSrc: string
  thumbSrc?: string
  blurhash?: string
  alt: string
  className?: string
  priority?: boolean
  width?: number
  height?: number
  onLoad?: () => void
  onError?: (e: any) => void
}

// Simple blurhash to CSS background converter
function blurhashToCSSBackground(blurhash: string): string {
  if (!blurhash || blurhash.length < 6) {
    return 'linear-gradient(45deg, #f0f0f0, #e0e0e0)'
  }
  
  // Extract basic color info from blurhash (simplified)
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'
  const r = (chars.indexOf(blurhash[1]) || 0) * 4
  const g = (chars.indexOf(blurhash[2]) || 0) * 4  
  const b = (chars.indexOf(blurhash[3]) || 0) * 4
  
  const baseColor = `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`
  const lightColor = `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`
  
  return `linear-gradient(45deg, ${baseColor}, ${lightColor})`
}

export default function ProgressiveImage({
  fullSrc,
  thumbSrc,
  blurhash,
  alt,
  className = '',
  priority = false,
  width,
  height,
  onLoad,
  onError
}: ProgressiveImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const fullImageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Preload the full image
  useEffect(() => {
    if (!fullSrc) return

    const img = new window.Image()
    img.decoding = 'async'
    
    img.onload = () => {
      setImageLoaded(true)
      if (onLoad) onLoad()
    }
    
    img.onerror = (e) => {
      setImageError(true)
      if (onError) onError(e)
    }
    
    // Start loading the full image
    img.src = fullSrc
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [fullSrc, onLoad, onError])

  // Determine what to show as placeholder
  const showThumb = thumbSrc && !imageLoaded && !imageError
  const showBlurhash = blurhash && !thumbSrc && !imageLoaded && !imageError
  const showFallback = !thumbSrc && !blurhash && !imageLoaded && !imageError

  // Get blur data URL for Next.js Image component
  const blurDataURL = thumbSrc || (blurhash ? `data:image/svg+xml;base64,${btoa(`
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${blurhashToCSSBackground(blurhash).split(',')[0].replace('linear-gradient(45deg, ', '')}" />
          <stop offset="100%" style="stop-color:${blurhashToCSSBackground(blurhash).split(',')[1].replace(')', '').trim()}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `)}` : undefined)

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        background: showBlurhash ? blurhashToCSSBackground(blurhash) : 
                   showFallback ? 'linear-gradient(45deg, #f3f4f6, #e5e7eb)' : 'transparent'
      }}
    >
      {/* Thumbnail layer */}
      {showThumb && (
        <Image
          src={thumbSrc}
          alt={alt}
          fill
          className="object-cover transition-opacity duration-300"
          style={{
            opacity: thumbLoaded ? 1 : 0,
          }}
          onLoad={() => setThumbLoaded(true)}
          priority={priority}
          quality={60}
        />
      )}

      {/* Full resolution image */}
      <Image
        ref={fullImageRef}
        src={imageLoaded ? fullSrc : (thumbSrc || '/placeholder.svg')}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        priority={priority}
        quality={90}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        {...(width && height ? { width, height } : {})}
        onError={(e) => {
          setImageError(true)
          if (onError) onError(e)
        }}
      />

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs">Failed to load</span>
          </div>
        </div>
      )}

      {/* Loading indicator for first load */}
      {!imageLoaded && !imageError && !thumbSrc && !blurhash && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
