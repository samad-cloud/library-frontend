/**
 * Script to standardize model names in the images table
 * Maps inconsistent model names to standard backend model names
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Standard model names mapping
 * Maps current inconsistent names to the actual backend model names
 */
const MODEL_NAME_MAPPING = {
  // Image Editor
  'imagen-editor': 'gemini-2.5-flash-image-preview',
  'gemini-imagen': 'gemini-2.5-flash-image-preview',
  
  // Imagen 4 variants
  'Imagen 4': 'imagen-4.0-generate-preview-06-06',
  'Imagen_4': 'imagen-4.0-generate-preview-06-06',
  'Imagen_4_Original': 'imagen-4.0-generate-preview-06-06',
  'Imagen 4 Original': 'imagen-4.0-generate-preview-06-06', 
  'imagen-4': 'imagen-4.0-generate-preview-06-06',
  
  // Google Ads white background variants (use gemini model)
  'Imagen_4_GoogleAds': 'gemini-2.5-flash-image-preview',
  'Imagen 4 Google Ads': 'gemini-2.5-flash-image-preview',
  
  // Social Media model variants
  'geminiImagen3': 'imagen-3.0-generate-002',
  'geminiImagen4': 'imagen-4.0-generate-preview-06-06',
  'geminiImagen4Ultra': 'imagen-4.0-generate-preview-06-06',
  'Gemini Imagen 3': 'imagen-3.0-generate-002',
  'Gemini Imagen 4': 'imagen-4.0-generate-preview-06-06',
  'Gemini Imagen 4 Ultra': 'imagen-4.0-generate-preview-06-06',
  
  // Legacy/generic names
  'ai-model': 'imagen-4.0-generate-preview-06-06',
  'gpt-image-1': 'gpt-image-1'
}

/**
 * Get unique model names currently in the database
 */
async function getCurrentModelNames() {
  try {
    const { data, error } = await supabase
      .from('images')
      .select('model_name')
      .not('model_name', 'is', null)
    
    if (error) {
      throw error
    }
    
    const uniqueNames = [...new Set(data.map(row => row.model_name))].filter(Boolean)
    return uniqueNames.sort()
  } catch (error) {
    console.error('❌ Error fetching model names:', error.message)
    return []
  }
}

/**
 * Update model names in batches
 */
async function updateModelNames() {
  console.log('🔄 Starting model name standardization...')
  
  let totalUpdated = 0
  let totalFailed = 0
  
  for (const [oldName, newName] of Object.entries(MODEL_NAME_MAPPING)) {
    try {
      console.log(`\n📝 Updating "${oldName}" → "${newName}"`)
      
      // Count records that will be updated
      const { count, error: countError } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true })
        .eq('model_name', oldName)
      
      if (countError) {
        console.error(`❌ Error counting records for "${oldName}":`, countError.message)
        totalFailed++
        continue
      }
      
      if (count === 0) {
        console.log(`⏭️  No records found with model_name "${oldName}"`)
        continue
      }
      
      console.log(`📊 Found ${count} records to update`)
      
      // Update the records
      const { error: updateError } = await supabase
        .from('images')
        .update({ model_name: newName })
        .eq('model_name', oldName)
      
      if (updateError) {
        console.error(`❌ Error updating "${oldName}":`, updateError.message)
        totalFailed++
      } else {
        console.log(`✅ Successfully updated ${count} records`)
        totalUpdated += count
      }
      
    } catch (error) {
      console.error(`❌ Unexpected error updating "${oldName}":`, error.message)
      totalFailed++
    }
  }
  
  return { totalUpdated, totalFailed }
}

/**
 * Display current model name distribution
 */
async function showModelNameDistribution() {
  console.log('\n📊 Current model name distribution:')
  console.log('=====================================')
  
  try {
    const { data, error } = await supabase
      .from('images')
      .select('model_name')
      .not('model_name', 'is', null)
    
    if (error) {
      throw error
    }
    
    const distribution = {}
    data.forEach(row => {
      const modelName = row.model_name || 'null'
      distribution[modelName] = (distribution[modelName] || 0) + 1
    })
    
    Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .forEach(([name, count]) => {
        const isStandard = Object.values(MODEL_NAME_MAPPING).includes(name) || 
                          name === 'gemini-2.5-flash-image-preview' ||
                          name === 'imagen-4.0-generate-preview-06-06' ||
                          name === 'imagen-3.0-generate-002'
        const status = isStandard ? '✅' : '❌'
        console.log(`${status} ${name}: ${count} records`)
      })
    
  } catch (error) {
    console.error('❌ Error getting distribution:', error.message)
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Model Name Standardization Script')
  console.log('===================================')
  console.log('📅 Started at:', new Date().toISOString())
  
  try {
    // Show current distribution
    await showModelNameDistribution()
    
    // Show mapping that will be applied
    console.log('\n🗺️  Model name mapping to be applied:')
    console.log('======================================')
    Object.entries(MODEL_NAME_MAPPING).forEach(([old, newName]) => {
      console.log(`"${old}" → "${newName}"`)
    })
    
    console.log('\n⚠️  This will update records in the database.')
    console.log('⚠️  Make sure you have a backup before proceeding.')
    
    // In a real script, you might want to add confirmation
    // For automation, we'll proceed directly
    console.log('\n🔄 Proceeding with updates...')
    
    // Perform updates
    const results = await updateModelNames()
    
    // Show final distribution
    console.log('\n📊 Updated model name distribution:')
    await showModelNameDistribution()
    
    // Summary
    console.log('\n🎉 Standardization completed!')
    console.log('============================')
    console.log('📅 Finished at:', new Date().toISOString())
    console.log(`✅ Total records updated: ${results.totalUpdated}`)
    console.log(`❌ Failed updates: ${results.totalFailed}`)
    
    if (results.totalFailed > 0) {
      console.log('\n⚠️  Some updates failed. Check the logs above for details.')
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Script interrupted by user')
  process.exit(0)
})

// Run the script
main().catch(console.error)
