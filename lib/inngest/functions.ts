import { inngest } from '../inngest'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { removeVectorStoreReferences } from '../vectorStoreUtils'
import { createClient } from '../../utils/supabase/server'

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
})

// Google SEM Assistant ID
const GOOGLE_SEM_ASSISTANT_ID = 'asst_tMb6dYkeLo83T67GcdqTmGQL'

interface CSVRowResult {
  rowIndex: number
  prompt: string
  generatedContent: string
  originalImageUrl: string | null
  whiteBackgroundImageUrl: string | null
  status: 'success' | 'failed'
  error?: string
  metadata?: Record<string, any>
}

// Main bulk processing workflow
export const processBulkCSV = inngest.createFunction(
  { 
    id: 'process-bulk-csv',
    name: 'Process Bulk CSV Data',
    retries: 2,
  },
  { event: 'bulk/csv.process' },
  async ({ event, step, logger }) => {
    const { 
      jobId, 
      userId, 
      csvData, 
      aspectRatio = '1:1',
      batchSize = 5,
      totalRows 
    } = event.data

    logger.info('🚀 Starting bulk CSV processing', { 
      jobId, 
      userId, 
      totalRows,
      batchSize 
    })

    // Step 1: Initialize job in database
    await step.run('initialize-job', async () => {
      const supabase = await createClient()
      
      await supabase
        .from('csv_batches')
        .insert({
          id: jobId,
          user_id: userId,
          filename: `bulk_${Date.now()}.csv`,
          original_filename: `bulk_${Date.now()}.csv`,
          total_rows: totalRows,
          processed_rows: 0,
          successful_rows: 0,
          failed_rows: 0,
          status: 'processing',
          template_id: null,
          error_message: null,
          created_at: new Date().toISOString(),
        })

      logger.info('✅ Job initialized in database', { jobId })
    })

    // Step 2: Process CSV data in batches
    const results: CSVRowResult[] = []
    let processedCount = 0
    let successCount = 0
    let failureCount = 0

    const totalBatches = Math.ceil(csvData.length / batchSize)

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize
      const batch = csvData.slice(batchStart, batchStart + batchSize)
      
      // Process each batch as a separate step for better retry granularity
      const batchResults = await step.run(`process-batch-${batchIndex}`, async () => {
        logger.info(`📦 Processing batch ${batchIndex + 1}/${totalBatches}`, {
          batchStart,
          batchSize: batch.length
        })

        const batchPromises = batch.map(async (row: Record<string, any>, batchIndexInner: number) => {
          const rowIndex = batchStart + batchIndexInner
          
          // Build prompt from multiple columns
          const country = row["country"] || ''
          const productType = row["product_type"] || ''
          const mpn = row["mpn"] || ''
          const size = row["size"] || ''
          
          // Construct the prompt from the CSV columns
          const prompt = `Country: ${country}, Product: ${productType}, MPN: ${mpn}, Product Size: ${size}`.trim()

          if (!country || !productType || !mpn || !size) {
            const missingFields = []
            if (!country) missingFields.push('country')
            if (!productType) missingFields.push('product_type') 
            if (!mpn) missingFields.push('mpn')
            if (!size) missingFields.push('size')
            
            const result: CSVRowResult = {
              rowIndex,
              prompt,
              generatedContent: '',
              originalImageUrl: null,
              whiteBackgroundImageUrl: null,
              status: 'failed',
              error: `Missing required columns: ${missingFields.join(', ')}`,
              metadata: row
            }
            return result
          }

          try {
            logger.info(`📝 Processing row ${rowIndex + 1}: "${prompt.substring(0, 50)}..."`)

            // Step 1: Generate content with Google SEM Assistant
            const run = await openai.beta.threads.createAndRun({
              assistant_id: GOOGLE_SEM_ASSISTANT_ID,
              thread: {
                messages: [
                  { role: 'user', content: prompt.trim() }
                ]
              }
            })

            // Poll for completion with longer timeout
            let runStatus = run
            let pollCount = 0
            const maxPolls = 60 // 1 minute timeout per row

            while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
              if (pollCount >= maxPolls) {
                throw new Error('Assistant request timed out')
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000))
              runStatus = await openai.beta.threads.runs.retrieve(run.id, {thread_id: runStatus.thread_id})
              pollCount++
            }

            if (runStatus.status !== 'completed') {
              throw new Error(`Assistant run failed with status: ${runStatus.status}`)
            }

            // Get assistant response
            const messages = await openai.beta.threads.messages.list(runStatus.thread_id)
            const assistantMessage = messages.data.find(m => m.role === 'assistant')
            
            if (!assistantMessage?.content[0] || assistantMessage.content[0].type !== 'text') {
              throw new Error('No valid response from assistant')
            }

            const rawGeneratedContent = assistantMessage.content[0].text.value
            const generatedContent = removeVectorStoreReferences(rawGeneratedContent)

            // Step 2: Generate Original Lifestyle Image
            logger.info(`🎨 Generating original image for row ${rowIndex + 1}...`)
            
            let parsedResponse: any
            try {
              parsedResponse = JSON.parse(generatedContent)
            } catch (error) {
              parsedResponse = { prompt: generatedContent }
            }
            
            const cleanedPrompt = removeVectorStoreReferences(parsedResponse.prompt || generatedContent)
            const finalPrompt = `${cleanedPrompt}. There should be no text on the product.`
            
            const originalImageResult = await genAI.models.generateImages({
              model: 'imagen-4.0-generate-preview-06-06',
              prompt: finalPrompt,
              config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio
              }
            })

            const originalImageUrl = originalImageResult?.generatedImages?.[0]?.image?.imageBytes || null

            if (!originalImageUrl) {
              throw new Error('Failed to generate original image')
            }

            logger.info(`✅ Original image generated for row ${rowIndex + 1}`)

            // Step 3: Convert to White Background (Google Ads format)
            logger.info(`🔄 Converting to white background for row ${rowIndex + 1}...`)
            
            const googleAdsPrompt = `{
  "task": "Convert product photo into a Google Ads–ready image",
  "requirements": {
    "preprocessing": {
      "zoom": "Zoom in on the product",
      "crop": "Crop the image to the exact dimensions of the product"
    },
    "background": {
      "color": "#FFFFFF",
      "description": "Pure white, completely clean and distraction-free"
    },
    "focus": {
      "subject": "Product must be the sole subject",
      "frame_coverage": "More than 90% of the frame"
    },
    "framing": {
      "whitespace": "Minimize all whitespace",
      "position": "Product should nearly touch the edges of the frame while staying centered"
    },
    "angle": "Top-down view, making the product the primary focus",
    "dimensions": {
      "aspect_ratio": "Same as original source image",
      "size": "Keep exact dimensions of original image"
    },
    "text": "Remove any marketing or campaign text",
    "style": "Clean, sharp, and studio-like, similar to professional Google Shopping or Ads catalog images"
  }
}`

            const originalImageBase64 = Buffer.from(originalImageUrl, 'base64').toString('base64')

            const editPrompt = [
              { text: googleAdsPrompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: originalImageBase64
                }
              }
            ]
            
            const nanoBananaResult = await genAI.models.generateContent({
              model: 'gemini-2.5-flash-image-preview',
              contents: editPrompt,
            })

            let whiteBackgroundImageUrl: string | null = null
            const parts = nanoBananaResult?.candidates?.[0]?.content?.parts || []
            
            for (const part of parts) {
              if (part.inlineData?.data) {
                const imageData = part.inlineData.data
                whiteBackgroundImageUrl = Buffer.from(imageData, "base64").toString('base64')
                break
              }
            }

            logger.info(`✅ White background image generated for row ${rowIndex + 1}`)

            // Store images in Supabase instead of returning them in the step
            // This prevents the step output size limit issue
            const supabase = await createClient()
            
            let storedOriginalUrl: string | null = null
            let storedWhiteBackgroundUrl: string | null = null
            
            try {
              // Upload original image to Supabase Storage
              if (originalImageUrl) {
                const originalBuffer = Buffer.from(originalImageUrl, 'base64')
                const originalFileName = `bulk/${jobId}/original_${rowIndex}_${Date.now()}.png`
                
                const { data: originalUpload, error: originalError } = await supabase.storage
                  .from('google_sem/csv-generated/inngest')
                  .upload(originalFileName, originalBuffer, {
                    contentType: 'image/png',
                    upsert: true
                  })
                
                if (originalError) {
                  logger.error(`Failed to upload original image for row ${rowIndex + 1}:`, { error: originalError })
                } else {
                  storedOriginalUrl = originalUpload.path
                }
              }
              
              // Upload white background image to Supabase Storage  
              if (whiteBackgroundImageUrl) {
                const whiteBuffer = Buffer.from(whiteBackgroundImageUrl, 'base64')
                const whiteFileName = `bulk/${jobId}/white_${rowIndex}_${Date.now()}.png`
                
                const { data: whiteUpload, error: whiteError } = await supabase.storage
                  .from('google_sem/csv-generated/inngest')
                  .upload(whiteFileName, whiteBuffer, {
                    contentType: 'image/png', 
                    upsert: true
                  })
                
                if (whiteError) {
                  logger.error(`Failed to upload white background image for row ${rowIndex + 1}:`, { error: whiteError })
                } else {
                  storedWhiteBackgroundUrl = whiteUpload.path
                }
              }
            } catch (uploadError) {
              logger.error(`Error uploading images for row ${rowIndex + 1}:`, { error: uploadError })
            }

            const result: CSVRowResult = {
              rowIndex,
              prompt: prompt.trim(),
              generatedContent,
              originalImageUrl: storedOriginalUrl, // Store path instead of base64
              whiteBackgroundImageUrl: storedWhiteBackgroundUrl, // Store path instead of base64
              status: 'success',
              metadata: {
                threadId: runStatus.thread_id,
                aspectRatio: aspectRatio,
                assistantId: GOOGLE_SEM_ASSISTANT_ID,
                hasOriginalImage: !!originalImageUrl,
                hasWhiteBackgroundImage: !!whiteBackgroundImageUrl
              }
            }

            return result

          } catch (error) {
            // Ensure error is properly serializable for Inngest
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorStack = error instanceof Error ? error.stack : undefined
            
            logger.error(`❌ Error processing row ${rowIndex + 1}:`, { 
              message: errorMessage,
              stack: errorStack?.substring(0, 500) // Truncate stack trace
            })
            
            const result: CSVRowResult = {
              rowIndex,
              prompt: prompt || '',
              generatedContent: '',
              originalImageUrl: null,
              whiteBackgroundImageUrl: null,
              status: 'failed',
              error: errorMessage,
              metadata: {
                errorType: error instanceof Error ? error.constructor.name : 'Unknown',
                originalRow: {
                  country: row.country,
                  product_type: row.product_type,
                  mpn: row.mpn,
                  size: row.size
                }
              }
            }

            return result
          }
        })

        // Wait for batch to complete
        const batchResults = await Promise.allSettled(batchPromises)
        const processedBatchResults: CSVRowResult[] = []

        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            processedBatchResults.push(result.value)
            if (result.value.status === 'success') {
              successCount++
            } else {
              failureCount++
            }
          } else {
            logger.error('Batch promise failed:', { reason: result.reason })
            processedBatchResults.push({
              rowIndex: processedCount,
              prompt: '',
              generatedContent: '',
              originalImageUrl: null,
              whiteBackgroundImageUrl: null,
              status: 'failed',
              error: 'Batch processing failed'
            })
            failureCount++
          }
          processedCount++
        })

        logger.info(`✅ Batch ${batchIndex + 1} completed`, {
          processed: processedCount,
          total: totalRows,
          success: successCount,
          failed: failureCount
        })

        return processedBatchResults
      })

      // Add batch results to overall results
      results.push(...batchResults.map(result => ({
        rowIndex: result.rowIndex,
        prompt: result.prompt,
        generatedContent: result.generatedContent,
        originalImageUrl: result.originalImageUrl,
        whiteBackgroundImageUrl: result.whiteBackgroundImageUrl,
        status: result.status,
        error: result.error,
        metadata: result.metadata
      } as CSVRowResult)))

      // Update progress in database after each batch
      await step.run(`update-progress-${batchIndex}`, async () => {
        const supabase = await createClient()
        
        await supabase
          .from('csv_batches')
          .update({
            processed_rows: processedCount,
            successful_rows: successCount,
            failed_rows: failureCount,
            status: processedCount >= totalRows ? 'completed' : 'processing'
          })
          .eq('id', jobId)

        logger.info(`📊 Progress updated in database`, {
          jobId,
          processed: processedCount,
          total: totalRows
        })
      })

      // Add delay between batches to prevent rate limiting
      if (batchIndex < totalBatches - 1) {
        await step.sleep('batch-delay', '2s')
      }
    }

    // Step 3: Finalize job
    await step.run('finalize-job', async () => {
      const supabase = await createClient()
      
      const finalStatus = failureCount === totalRows ? 'failed' : 'completed'
      
      await supabase
        .from('csv_batches')
        .update({
          processed_rows: processedCount,
          successful_rows: successCount,
          failed_rows: failureCount,
          status: finalStatus,
          error_message: failureCount > 0 ? `${failureCount} rows failed processing` : null
        })
        .eq('id', jobId)

      logger.info('🎉 Bulk CSV processing completed!', {
        jobId,
        totalRows,
        successCount,
        failureCount,
        successRate: processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0
      })
    })

    // Return minimal results to prevent output size limit
    // Full results are already stored in the database
    return {
      jobId,
      success: true,
      summary: {
        totalRows,
        processedRows: processedCount,
        successCount,
        failureCount,
        successRate: processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0
      },
      // Only return result summaries, not full data
      resultSummary: {
        successfulRows: results.filter(r => r.status === 'success').map(r => r.rowIndex),
        failedRows: results.filter(r => r.status === 'failed').map(r => ({ 
          rowIndex: r.rowIndex, 
          error: r.error 
        }))
      },
      completedAt: new Date().toISOString()
    }
  }
)