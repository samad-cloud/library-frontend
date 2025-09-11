/**
 * One-time script to update image dimensions in the images table
 * Fetches all records, gets dimensions from storage_url, and updates width/height columns
 */

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import sharp from 'sharp'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Get image dimensions from a URL using sharp
 * @param {string} imageUrl - The public URL of the image
 * @returns {Promise<{width: number, height: number} | null>}
 */
async function getImageDimensions(imageUrl) {
  try {
    console.log(`📏 Getting dimensions for: ${imageUrl.substring(0, 80)}...`)
    
    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch image: ${response.status} ${response.statusText}`)
      return null
    }
    
    // Get the image buffer
    const buffer = await response.buffer()
    
    // Use sharp to get metadata
    const metadata = await sharp(buffer).metadata()
    
    if (metadata.width && metadata.height) {
      console.log(`✅ Dimensions: ${metadata.width}x${metadata.height}`)
      return {
        width: metadata.width,
        height: metadata.height
      }
    } else {
      console.warn('⚠️  Could not extract dimensions from metadata')
      return null
    }
  } catch (error) {
    console.error(`❌ Error getting dimensions:`, error.message)
    return null
  }
}

/**
 * Update a single image record with dimensions
 * @param {string} imageId - The ID of the image record
 * @param {number} width - The image width
 * @param {number} height - The image height
 */
async function updateImageDimensions(imageId, width, height) {
  try {
    const { error } = await supabase
      .from('images')
      .update({ width, height })
      .eq('id', imageId)
    
    if (error) {
      console.error(`❌ Failed to update image ${imageId}:`, error.message)
      return false
    } else {
      console.log(`✅ Updated image ${imageId}: ${width}x${height}`)
      return true
    }
  } catch (error) {
    console.error(`❌ Error updating image ${imageId}:`, error.message)
    return false
  }
}

/**
 * Process a batch of images
 * @param {Array} images - Array of image records
 * @param {number} batchNumber - Current batch number for logging
 */
async function processBatch(images, batchNumber) {
  console.log(`\n🔄 Processing batch ${batchNumber} (${images.length} images)...`)
  
  let successCount = 0
  let failCount = 0
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const imageNum = (batchNumber - 1) * 50 + i + 1
    
    console.log(`\n[${imageNum}] Processing image ID: ${image.id}`)
    
    // Skip if dimensions already exist
    if (image.width && image.height) {
      console.log(`⏭️  Skipping - dimensions already exist: ${image.width}x${image.height}`)
      successCount++
      continue
    }
    
    // Skip if no storage URL
    if (!image.storage_url) {
      console.log(`⏭️  Skipping - no storage URL`)
      failCount++
      continue
    }
    
    // Get dimensions from the image URL
    const dimensions = await getImageDimensions(image.storage_url)
    
    if (dimensions) {
      // Update the database
      const updated = await updateImageDimensions(image.id, dimensions.width, dimensions.height)
      if (updated) {
        successCount++
      } else {
        failCount++
      }
    } else {
      console.log(`❌ Failed to get dimensions for image ${image.id}`)
      failCount++
    }
    
    // Add a small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`\n📊 Batch ${batchNumber} complete: ${successCount} success, ${failCount} failed`)
  return { successCount, failCount }
}

/**
 * Main function to process all images
 */
async function main() {
  console.log('🚀 Starting image dimensions update script...')
  console.log('📅 Started at:', new Date().toISOString())
  
  try {
    // Get total count first
    const { count, error: countError } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error getting image count:', countError.message)
      process.exit(1)
    }
    
    console.log(`📊 Total images in database: ${count}`)
    
    let totalProcessed = 0
    let totalSuccess = 0
    let totalFailed = 0
    let batchNumber = 1
    const batchSize = 50
    
    // Process images in batches to avoid memory issues
    while (totalProcessed < count) {
      console.log(`\n📥 Fetching batch ${batchNumber}...`)
      
      const { data: images, error } = await supabase
        .from('images')
        .select('id, storage_url, width, height')
        .range(totalProcessed, totalProcessed + batchSize - 1)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('❌ Error fetching images:', error.message)
        break
      }
      
      if (!images || images.length === 0) {
        console.log('📝 No more images to process')
        break
      }
      
      // Process this batch
      const batchResults = await processBatch(images, batchNumber)
      
      totalProcessed += images.length
      totalSuccess += batchResults.successCount
      totalFailed += batchResults.failCount
      batchNumber++
      
      console.log(`\n📈 Progress: ${totalProcessed}/${count} images processed`)
      console.log(`📊 Running totals: ${totalSuccess} success, ${totalFailed} failed`)
      
      // If we got fewer images than batch size, we're done
      if (images.length < batchSize) {
        break
      }
    }
    
    console.log('\n🎉 Script completed!')
    console.log('📅 Finished at:', new Date().toISOString())
    console.log(`📊 Final results:`)
    console.log(`   Total processed: ${totalProcessed}`)
    console.log(`   Successfully updated: ${totalSuccess}`)
    console.log(`   Failed: ${totalFailed}`)
    console.log(`   Success rate: ${((totalSuccess / totalProcessed) * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('❌ Script failed with error:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Script interrupted by user')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Script terminated')
  process.exit(0)
})

// Run the script
main().catch(console.error)
