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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://nkjihejhyrquyegmqimi.supabase.co'
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ramloZWpoeXJxdXllZ21xaW1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk3NjQwNiwiZXhwIjoyMDY3NTUyNDA2fQ.zUe-taYmWKzycUwpIfeghHA2BNpgVV5cC4a4gBS1GQQ'
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // No need to download the image - we'll just create thumbnail metadata
    console.log(`📸 Processing image: ${imageId}`)
    
    // Create a simple 1x1 pixel thumbnail placeholder (tiny file)
    // This is just a placeholder - in production you'd generate actual thumbnails
    const thumbnailBuffer = new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
      0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
      0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02,
      0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0x00, 0xFF, 0xD9
    ]) // 1x1 pixel JPEG

    const originalBytes = 50000 // Estimate for typical AI-generated image
    
    // Generate a simple blurhash placeholder
    const generateSimpleBlurhash = (): string => {
      // Generate a random-ish but consistent blurhash based on imageId
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'
      const seed = imageId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
      const hash = `L${chars[seed % chars.length]}${chars[(seed * 2) % chars.length]}${chars[(seed * 3) % chars.length]}00000000`
      return hash
    }

    const blurhash = generateSimpleBlurhash()

    // For now, we'll estimate dimensions based on common image sizes
    // In production, you'd want proper image analysis
    const estimatedWidth = 1024
    const estimatedHeight = 1024

    // Upload thumbnail to dedicated thumbnails bucket
    const thumbnailPath = `${imageId}_thumb.jpg`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('thumbnails')
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
      .from('thumbnails')
      .getPublicUrl(thumbnailPath)

    // Update the images table with thumbnail data
    const { error: updateError } = await supabase
      .from('images')
      .update({
        thumb_url: publicUrl,
        blurhash: blurhash,
        width: estimatedWidth,
        height: estimatedHeight,
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
          width: estimatedWidth,
          height: estimatedHeight,
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