/**
 * Client-side image compression utilities for the image editor
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  maxSizeMB?: number
}

export interface CompressionResult {
  compressedBase64: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
  wasCompressed: boolean
}

/**
 * Compresses an image file or base64 string to reduce payload size
 */
export async function compressImage(
  input: File | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.8,
    format = 'jpeg',
    maxSizeMB = 5
  } = options

  let originalBase64: string
  let originalSize: number

  // Handle File input
  if (input instanceof File) {
    originalBase64 = await fileToBase64(input)
    originalSize = input.size
  } else {
    // Handle base64 string input
    originalBase64 = input.startsWith('data:') ? input.split(',')[1] : input
    originalSize = calculateBase64Size(originalBase64)
  }

  // Check if compression is needed
  const originalSizeMB = originalSize / (1024 * 1024)
  
  // If image is already small enough, return as-is
  if (originalSizeMB <= maxSizeMB) {
    const dimensions = await getImageDimensions(originalBase64)
    if (dimensions.width <= maxWidth && dimensions.height <= maxHeight) {
      return {
        compressedBase64: originalBase64,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false
      }
    }
  }

  // Perform compression
  const compressedBase64 = await compressImageCanvas(originalBase64, {
    maxWidth,
    maxHeight,
    quality,
    format
  })

  const compressedSize = calculateBase64Size(compressedBase64)
  const compressionRatio = compressedSize / originalSize

  return {
    compressedBase64,
    originalSize,
    compressedSize,
    compressionRatio,
    wasCompressed: true
  }
}

/**
 * Converts a File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Calculates the approximate size of a base64 string in bytes
 */
function calculateBase64Size(base64: string): number {
  // Base64 encoding increases size by ~33%
  // Remove padding characters and calculate
  const withoutPadding = base64.replace(/=/g, '')
  return (withoutPadding.length * 3) / 4
}

/**
 * Gets image dimensions from base64
 */
function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = reject
    img.src = `data:image/png;base64,${base64}`
  })
}

/**
 * Compresses image using canvas
 */
function compressImageCanvas(
  base64: string,
  options: {
    maxWidth: number
    maxHeight: number
    quality: number
    format: string
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate new dimensions
        let { width, height } = img
        const { maxWidth, maxHeight } = options

        // Calculate scaling factor
        const scaleX = maxWidth / width
        const scaleY = maxHeight / height
        const scale = Math.min(scaleX, scaleY, 1) // Don't upscale

        const newWidth = Math.round(width * scale)
        const newHeight = Math.round(height * scale)

        // Set canvas size
        canvas.width = newWidth
        canvas.height = newHeight

        // Draw and compress
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, newWidth, newHeight)
        
        // Get compressed base64
        const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg'
        const compressedDataUrl = canvas.toDataURL(mimeType, options.quality)
        const compressedBase64 = compressedDataUrl.split(',')[1]
        
        resolve(compressedBase64)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:image/png;base64,${base64}`
  })
}

/**
 * Validates if an image meets size requirements
 */
export function validateImageSize(
  base64: string,
  maxSizeMB: number = 5
): { isValid: boolean; sizeMB: number; message?: string } {
  const sizeBytes = calculateBase64Size(base64)
  const sizeMB = sizeBytes / (1024 * 1024)
  
  if (sizeMB > maxSizeMB) {
    return {
      isValid: false,
      sizeMB,
      message: `Image size (${sizeMB.toFixed(2)}MB) exceeds limit (${maxSizeMB}MB)`
    }
  }
  
  return { isValid: true, sizeMB }
}

/**
 * Helper to format file sizes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
