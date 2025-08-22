// Script to backfill thumbnail data for existing images
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://nkjihejhyrquyegmqimi.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ramloZWpoeXJxdXllZ21xaW1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk3NjQwNiwiZXhwIjoyMDY3NTUyNDA2fQ.zUe-taYmWKzycUwpIfeghHA2BNpgVV5cC4a4gBS1GQQ"

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function backfillThumbnails() {
  console.log('🔍 Finding images without thumbnail data...')
  
  // Get images that don't have thumbnail data
  const { data: images, error } = await supabase
    .from('images')
    .select('id, storage_url')
    .is('thumb_url', null)
    .limit(50) // Process in batches
  
  if (error) {
    console.error('❌ Error fetching images:', error)
    return
  }
  
  console.log(`📸 Found ${images.length} images to process`)
  
  for (const image of images) {
    try {
      console.log(`🔄 Processing image ${image.id}...`)
      // Call the edge function to generate thumbnail
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-thumbnail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageId: image.id,
          storageUrl: image.storage_url
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Generated thumbnail for ${image.id}: ${result.thumbUrl}`)
      } else {
        const error = await response.text()
        console.error(`❌ Failed to generate thumbnail for ${image.id}: ${error}`)
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`❌ Error processing ${image.id}:`, error)
    }
  }
  
  console.log('✅ Backfill complete!')
}

backfillThumbnails()
