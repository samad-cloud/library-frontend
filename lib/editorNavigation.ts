/**
 * Utility functions for handling navigation to the image editor
 * Handles both small images (via URL parameters) and large images (via sessionStorage)
 * to avoid 413 Request Entity Too Large errors
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { uploadToEditorCleanup } from '@/utils/supabase/imageStorage'


export interface NavigateToEditorOptions {
  imageUrl: string
  imageName?: string
  router: AppRouterInstance
  sizeThreshold?: number // Size threshold in characters, defaults to 2000
}

/**
 * Navigate to the image editor using temporary storage for reliable image transfer
 * @param options - Navigation options including image URL, name, and router instance
 */
export async function navigateToEditor({ 
  imageUrl, 
  imageName = 'Generated Image', 
  router, 
  sizeThreshold = 2000 // Still used for small URL optimization
}: NavigateToEditorOptions): Promise<void> {
  if (!imageUrl) {
    console.error('No image URL provided for editor navigation')
    return
  }
  
  try {
    console.log('🚀 Navigating to editor with image:', {
      url: imageUrl.substring(0, 50) + '...',
      name: imageName,
      length: imageUrl.length,
      isDataUrl: imageUrl.startsWith('data:'),
      isHttpUrl: imageUrl.startsWith('http')
    })
    
    // For HTTP URLs that are already public, use them directly
    if (imageUrl.startsWith('http') && !imageUrl.includes('data:')) {
      console.log('🔗 Using existing public URL')
      const encodedName = encodeURIComponent(imageName)
      router.push(`/editor?ref=${encodeURIComponent(imageUrl)}&name=${encodedName}`)
      return
    }
    
    // For data URLs or base64 data, upload to temporary storage first
    console.log('📤 Uploading to editor-cleanup bucket for reliable transfer')
    const uploadResult = await uploadToEditorCleanup(imageUrl, imageName)
    
    if (uploadResult.success && uploadResult.publicUrl) {
      console.log('✅ Upload successful, navigating with public URL')
      const encodedName = encodeURIComponent(imageName)
      router.push(`/editor?ref=${encodeURIComponent(uploadResult.publicUrl)}&name=${encodedName}&cleanup=true`)
    } else {
      throw new Error(uploadResult.error || 'Failed to upload image to temporary storage')
    }
    
  } catch (error) {
    console.error('Error navigating to editor:', error)
    
    // Fallback: try direct navigation for smaller images
    if (imageUrl.length <= sizeThreshold) {
      try {
        console.log('🔄 Fallback: trying direct URL navigation for small image')
        const encodedImage = encodeURIComponent(imageUrl)
        const encodedName = encodeURIComponent(imageName)
        router.push(`/editor?ref=${encodedImage}&name=${encodedName}`)
        return
      } catch (encodingError) {
        console.warn('Direct URL fallback also failed:', encodingError)
      }
    }
    
    // Final fallback - navigate to editor with error message
    try {
      console.log('🔄 Final fallback: navigating to editor with error message')
      const errorMessage = `Unable to load image in editor: ${error instanceof Error ? error.message : 'Unknown error'}. You can upload an image manually in the editor.`
      
      sessionStorage.setItem('editorError', errorMessage)
      router.push('/editor?source=error')
    } catch (finalError) {
      console.error('Complete navigation failure:', finalError)
      const userMessage = 'Failed to open editor. Please try refreshing the page or use a different browser.'
      alert(userMessage)
    }
  }
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use navigateToEditor instead
 */
export function navigateToImageEditor(imageUrl: string, imageName: string, router: AppRouterInstance): void {
  console.warn('navigateToImageEditor is deprecated, use navigateToEditor instead')
  navigateToEditor({ imageUrl, imageName, router })
}
