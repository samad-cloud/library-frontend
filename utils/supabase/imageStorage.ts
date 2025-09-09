import { createClient } from './client'

/**
 * Utility functions for saving generated images to Supabase storage
 */

export interface SaveImageOptions {
  imageUrl: string
  fileName?: string
  generator?: 'social-media' | 'email-marketing' | 'google-sem' | 'groupon'
  modelName?: string
  userId?: string
  promptUsed?: string
  aspectRatio?: string
}

export interface SaveImageResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Converts a data URL or base64 string to a buffer
 */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  if (dataUrl.startsWith('data:')) {
    // Data URL format: data:image/png;base64,iVBORw0KGgoAAAANS...
    const [header, base64Data] = dataUrl.split(',')
    const mimeMatch = header.match(/data:([^;]+)/)
    const contentType = mimeMatch ? mimeMatch[1] : 'image/png'
    const buffer = Buffer.from(base64Data, 'base64')
    return { buffer, contentType }
  } else {
    // Assume it's a base64 string
    const buffer = Buffer.from(dataUrl, 'base64')
    return { buffer, contentType: 'image/png' }
  }
}

/**
 * Downloads an image from a URL and returns a buffer
 */
async function urlToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/png'
  
  return { buffer, contentType }
}

/**
 * Saves a generated image to Supabase storage
 */
export async function saveGeneratedImage(options: SaveImageOptions): Promise<SaveImageResult> {
  try {
    const supabase = createClient()
    
    // Get current user if not provided
    let userId = options.userId
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      userId = user.id
    }

    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const generator = options.generator || 'generator'
    const modelName = options.modelName ? `_${options.modelName.replace(/\s+/g, '-').toLowerCase()}` : ''
    const defaultFileName = `${generator}${modelName}_${timestamp}.png`
    const fileName = options.fileName || defaultFileName

    // Create the storage path using existing bucket structure
    const storagePath = `generated/${userId}/${fileName}`

    let buffer: Buffer
    let contentType: string

    // Handle different image URL formats
    if (options.imageUrl.startsWith('data:') || options.imageUrl.match(/^[A-Za-z0-9+/]+=*$/)) {
      // Data URL or base64 string
      const result = dataUrlToBuffer(options.imageUrl)
      buffer = result.buffer
      contentType = result.contentType
    } else if (options.imageUrl.startsWith('http')) {
      // External URL
      const result = await urlToBuffer(options.imageUrl)
      buffer = result.buffer
      contentType = result.contentType
    } else {
      return { success: false, error: 'Invalid image URL format' }
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('image-main')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      })

    if (error) {
      console.error('Failed to upload image to storage:', error)
      return { success: false, error: `Upload failed: ${error.message}` }
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('image-main')
      .getPublicUrl(data.path)

    // Save metadata to database using existing images table
    try {
      const { error: dbError } = await supabase
        .from('images')
        .insert({
          storage_url: urlData.publicUrl,
          title: fileName || `Generated ${options.generator || 'image'}`,
          description: options.promptUsed ? `Generated from prompt: ${options.promptUsed}` : null,
          prompt_used: options.promptUsed,
          model_name: options.modelName || 'gemini-imagen',
          generation_source: 'manual',
          generation_metadata: {
            generator_type: options.generator,
            aspect_ratio: options.aspectRatio,
            storage_path: data.path,
            file_size: buffer.length,
            mime_type: contentType
          },
          format: contentType.split('/')[1] || 'png',
          bytes: buffer.length,
          tags: options.generator ? [options.generator] : []
        })

      if (dbError) {
        console.warn('Failed to save image metadata:', dbError)
        // Don't fail the entire operation if metadata save fails
      }
    } catch (metadataError) {
      console.warn('Error saving image metadata:', metadataError)
    }

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path
    }

  } catch (error) {
    console.error('Error saving image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Saves multiple images from a generator result
 */
export async function saveMultipleImages(
  images: Array<{ url: string; modelName?: string }>,
  options: Omit<SaveImageOptions, 'imageUrl' | 'modelName'>
): Promise<SaveImageResult[]> {
  const results = await Promise.all(
    images.map((image, index) => 
      saveGeneratedImage({
        ...options,
        imageUrl: image.url,
        modelName: image.modelName,
        fileName: options.fileName 
          ? `${index + 1}_${options.fileName}` 
          : undefined
      })
    )
  )
  
  return results
}

/**
 * Get all saved images for a user from the images table
 */
export async function getSavedImages(userId?: string, generator?: string): Promise<{ images: any[]; error?: string }> {
  try {
    const supabase = createClient()
    
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { images: [], error: 'User not authenticated' }
      }
      userId = user.id
    }

    // Build query for images table
    let query = supabase
      .from('images')
      .select('*')
      .eq('generation_source', 'manual')
      .order('created_at', { ascending: false })
      .limit(100)

    // Filter by generator type if specified
    if (generator) {
      query = query.contains('generation_metadata', { generator_type: generator })
    }

    const { data, error } = await query

    if (error) {
      return { images: [], error: error.message }
    }

    return { images: data || [] }
  } catch (error) {
    return { 
      images: [], 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}
