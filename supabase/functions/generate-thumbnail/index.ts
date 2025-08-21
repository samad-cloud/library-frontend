import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageId, storageUrl } = await req.json()
    
    if (!imageId || !storageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageId or storageUrl' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Download the original image
    console.log(`📸 Processing image: ${imageId}`)
    const imageResponse = await fetch(storageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const uint8Array = new Uint8Array(imageBuffer)

    // Import sharp dynamically (Deno edge function)
    const { default: sharp } = await import('https://deno.land/x/sharp@0.32.6/mod.ts')

    // Get original image dimensions
    const image = sharp(uint8Array)
    const metadata = await image.metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0
    const originalBytes = uint8Array.length

    // Generate thumbnail (24px width, maintaining aspect ratio)
    const thumbnailWidth = 24
    const thumbnailHeight = Math.round((originalHeight / originalWidth) * thumbnailWidth)
    
    const thumbnailBuffer = await image
      .resize(thumbnailWidth, thumbnailHeight, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 60, progressive: true })
      .toBuffer()

    // Generate blurhash from a very small version (8x8)
    const blurhashBuffer = await sharp(uint8Array)
      .resize(8, 8, { fit: 'cover' })
      .ensureAlpha()
      .raw()
      .toBuffer()

    // Simple blurhash implementation (basic version)
    // In production, you'd want to use a proper blurhash library
    const generateBlurhash = (buffer: Uint8Array, width: number, height: number): string => {
      // This is a simplified blurhash - in production use actual blurhash library
      const r = buffer[0] || 0
      const g = buffer[1] || 0
      const b = buffer[2] || 0
      
      // Convert to base83 (simplified)
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'
      const hash = `L${chars[Math.floor(r / 4)]}${chars[Math.floor(g / 4)]}${chars[Math.floor(b / 4)]}00000000`
      return hash
    }

    const blurhash = generateBlurhash(blurhashBuffer, 8, 8)

    // Upload thumbnail to Supabase Storage
    const thumbnailPath = `thumbnails/${imageId}_thumb.jpg`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 year cache
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Get public URL for thumbnail
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(thumbnailPath)

    // Update the images table with thumbnail data
    const { error: updateError } = await supabase
      .from('images')
      .update({
        thumb_url: publicUrl,
        blurhash: blurhash,
        width: originalWidth,
        height: originalHeight,
        bytes: originalBytes
      })
      .eq('id', imageId)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw updateError
    }

    console.log(`✅ Generated thumbnail for ${imageId}: ${publicUrl}`)

    return new Response(
      JSON.stringify({
        success: true,
        imageId,
        thumbUrl: publicUrl,
        blurhash,
        dimensions: {
          width: originalWidth,
          height: originalHeight,
          bytes: originalBytes
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Thumbnail generation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate thumbnail',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/* 
Usage example - call this edge function after image upload/generation:

const response = await fetch('https://your-project.supabase.co/functions/v1/generate-thumbnail', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageId: 'uuid-of-image-record',
    storageUrl: 'https://storage-url-of-original-image'
  })
})
*/
