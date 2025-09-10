/**
 * Utility functions for downloading images from URLs
 */

export interface DownloadImageOptions {
  imageUrl: string
  fileName?: string
  generator?: string
  modelName?: string
}

/**
 * Downloads an image from a URL by creating a temporary anchor element
 */
export async function downloadImage({
  imageUrl,
  fileName,
  generator = 'generated',
  modelName = 'ai-model'
}: DownloadImageOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const defaultFileName = fileName || `${generator}-${modelName}-${timestamp}.png`
    
    // For data URLs, we can download directly
    if (imageUrl.startsWith('data:')) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = defaultFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return { success: true }
    }
    
    // For external URLs, we need to fetch the image first to avoid CORS issues
    try {
      const response = await fetch(imageUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = defaultFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100)
      
      return { success: true }
    } catch (fetchError) {
      // If CORS prevents direct fetch, try opening in new tab with download suggestion
      console.warn('Direct download failed due to CORS, opening in new tab:', fetchError)
      
      // Create a link that opens in new tab
      const link = document.createElement('a')
      link.href = imageUrl
      link.target = '_blank'
      link.download = defaultFileName
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      return { 
        success: true, 
        error: 'Image opened in new tab. Please right-click and "Save As" to download.' 
      }
    }
  } catch (error) {
    console.error('Download failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to download image' 
    }
  }
}

/**
 * Extracts file extension from image URL or data URL
 */
function getImageExtension(imageUrl: string): string {
  if (imageUrl.startsWith('data:')) {
    const mimeMatch = imageUrl.match(/data:image\/([^;]+)/)
    return mimeMatch ? mimeMatch[1] : 'png'
  }
  
  const urlWithoutQuery = imageUrl.split('?')[0]
  const extension = urlWithoutQuery.split('.').pop()?.toLowerCase()
  
  // Return common image extensions, default to png
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return extension || 'png'
  }
  
  return 'png'
}

/**
 * Generates a user-friendly filename for downloaded images
 */
export function generateDownloadFileName({
  generator = 'generated',
  modelName = 'ai-model',
  imageUrl,
  customName
}: {
  generator?: string
  modelName?: string
  imageUrl: string
  customName?: string
}): string {
  const extension = getImageExtension(imageUrl)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  
  if (customName) {
    return `${customName.replace(/[^a-zA-Z0-9-_]/g, '_')}.${extension}`
  }
  
  const cleanGenerator = generator.replace(/[^a-zA-Z0-9-_]/g, '_')
  const cleanModelName = modelName.replace(/[^a-zA-Z0-9-_]/g, '_')
  
  return `${cleanGenerator}_${cleanModelName}_${timestamp}.${extension}`
}
