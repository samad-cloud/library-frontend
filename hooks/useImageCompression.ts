'use client'

import { useState, useCallback } from 'react'
import { compressImage, validateImageSize, formatFileSize, type CompressionOptions, type CompressionResult } from '@/utils/imageCompression'
import { useToast } from '@/hooks/use-toast'

interface UseImageCompressionOptions {
  maxSizeMB?: number
  maxWidth?: number
  maxHeight?: number
  quality?: number
  autoCompress?: boolean
  showToasts?: boolean
}

interface UseImageCompressionReturn {
  compressImageForEditor: (base64: string) => Promise<string>
  isCompressing: boolean
  lastCompressionResult: CompressionResult | null
  compressionStats: {
    originalSize: string
    compressedSize: string
    compressionRatio: string
    wasCompressed: boolean
  } | null
}

export function useImageCompression(options: UseImageCompressionOptions = {}): UseImageCompressionReturn {
  const {
    maxSizeMB = 5,
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.8,
    autoCompress = true,
    showToasts = true
  } = options

  const [isCompressing, setIsCompressing] = useState(false)
  const [lastCompressionResult, setLastCompressionResult] = useState<CompressionResult | null>(null)
  const { toast } = useToast()

  const compressImageForEditor = useCallback(async (base64: string): Promise<string> => {
    setIsCompressing(true)
    
    try {
      // First validate if compression is needed
      const validation = validateImageSize(base64, maxSizeMB)
      
      if (validation.isValid && !autoCompress) {
        // Image is already within limits and auto-compression is disabled
        setLastCompressionResult({
          compressedBase64: base64,
          originalSize: validation.sizeMB * 1024 * 1024,
          compressedSize: validation.sizeMB * 1024 * 1024,
          compressionRatio: 1,
          wasCompressed: false
        })
        return base64
      }

      // Compress the image
      const compressionOptions: CompressionOptions = {
        maxWidth,
        maxHeight,
        quality,
        format: 'jpeg', // JPEG generally provides better compression than PNG
        maxSizeMB
      }

      const result = await compressImage(base64, compressionOptions)
      setLastCompressionResult(result)

      // Show toast notifications if enabled
      if (showToasts) {
        if (result.wasCompressed) {
          const originalSizeMB = (result.originalSize / (1024 * 1024)).toFixed(2)
          const compressedSizeMB = (result.compressedSize / (1024 * 1024)).toFixed(2)
          const compressionPercent = ((1 - result.compressionRatio) * 100).toFixed(1)
          
          toast({
            title: "Image Compressed",
            description: `Reduced from ${originalSizeMB}MB to ${compressedSizeMB}MB (${compressionPercent}% reduction)`,
            duration: 4000,
          })
        } else if (validation.sizeMB > 1) {
          // Only show "no compression needed" for larger files
          toast({
            title: "Image Ready",
            description: `Image size (${validation.sizeMB.toFixed(2)}MB) is within limits`,
            duration: 3000,
          })
        }
      }

      // Final validation check
      const finalValidation = validateImageSize(result.compressedBase64, maxSizeMB)
      if (!finalValidation.isValid) {
        throw new Error(`Image still too large after compression: ${finalValidation.message}`)
      }

      return result.compressedBase64
      
    } catch (error) {
      console.error('Image compression failed:', error)
      
      if (showToasts) {
        toast({
          title: "Compression Failed",
          description: error instanceof Error ? error.message : "Failed to compress image",
          variant: "destructive",
          duration: 5000,
        })
      }
      
      throw error
    } finally {
      setIsCompressing(false)
    }
  }, [maxSizeMB, maxWidth, maxHeight, quality, autoCompress, showToasts, toast])

  const compressionStats = lastCompressionResult ? {
    originalSize: formatFileSize(lastCompressionResult.originalSize),
    compressedSize: formatFileSize(lastCompressionResult.compressedSize),
    compressionRatio: `${(lastCompressionResult.compressionRatio * 100).toFixed(1)}%`,
    wasCompressed: lastCompressionResult.wasCompressed
  } : null

  return {
    compressImageForEditor,
    isCompressing,
    lastCompressionResult,
    compressionStats
  }
}
