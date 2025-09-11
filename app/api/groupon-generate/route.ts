import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { removeVectorStoreReferences } from '@/lib/vectorStoreUtils'

type GrouponPromptArray = {
  prompts: string[]
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!})

const ASSISTANT_ID = 'asst_RmvnUzt5yRA64OBROEBzaKbU'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, aspectRatio = '1:1', numberOfVariations = 1 } = body

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('🎯 Starting Groupon Generation...')
    console.log('📝 Prompt:', prompt)
    console.log('📐 Aspect Ratio:', aspectRatio)
    console.log('🖼️ Number of Variations:', numberOfVariations)
    console.log('🤖 Assistant ID:', ASSISTANT_ID)

    // Step 1-3: Create and Run Thread with Assistant (combined)
    console.log('🧵 Creating thread and running assistant...')
    const run = await openai.beta.threads.createAndRun({
      assistant_id: ASSISTANT_ID,
      thread: {
        messages: [
          { role: 'user', content: prompt }
        ]
      }
    })
    console.log('✅ Thread and run created:', run.id)

    // Poll for completion
    let runStatus = run
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {thread_id: runStatus.thread_id})
      console.log('⏳ Run status:', runStatus.status)
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`)
    }

    console.log('✅ Assistant completed')

    // Step 4: Get Response
    const messages = await openai.beta.threads.messages.list(runStatus.thread_id)
    const assistantMessage = messages.data.find(m => m.role === 'assistant')
    
    if (!assistantMessage?.content[0] || assistantMessage.content[0].type !== 'text') {
      throw new Error('No valid response from assistant')
    }

    const rawGeneratedContent = assistantMessage.content[0].text.value
    console.log('📄 Raw generated content length:', rawGeneratedContent.length)

    // Remove vector store references from the generated content
    const generatedContent = removeVectorStoreReferences(rawGeneratedContent)
    console.log('📄 Cleaned generated content length:', generatedContent.length)

    // Step 5: Generate 6 Images with Imagen 4
    console.log('🎨 Generating 6 images with Imagen 4...')
    
    // Parse the assistant's JSON response
    let parsedResponse: GrouponPromptArray
    try {
      parsedResponse = JSON.parse(generatedContent)
    } catch (error) {
      throw new Error('Failed to parse assistant response as valid JSON')
    }

    // Validate that the parsed response has the required structure
    if (!parsedResponse.prompts || !Array.isArray(parsedResponse.prompts) || parsedResponse.prompts.length !== 6) {
      throw new Error('Assistant response must contain exactly 6 prompts')
    }

    console.log('🎬 Generating images for 6 prompts:', parsedResponse.prompts.map(p => p.substring(0, 50) + '...'))
    
    // Generate images for all 6 prompts
    const imageGenerationPromises = parsedResponse.prompts.map(async (prompt, index) => {
      try {
        console.log(`🎨 Generating image ${index + 1}/6...`)
        const imageResult = await genAI.models.generateImages({
          model: 'imagen-4.0-generate-preview-06-06',
          prompt: prompt,
          config: {
            numberOfImages: numberOfVariations,
            aspectRatio: '16:9'
          }
        })
        
        const generatedImages = imageResult?.generatedImages || []
        console.log(`✅ Image ${index + 1}/6 generated successfully (${generatedImages.length} variations)`)
        
        // Return all variations for this prompt
        const variations = generatedImages.map((img, varIndex) => ({
          index: index + 1,
          variation: varIndex + 1,
          prompt: prompt,
          imageUrl: img?.image?.imageBytes || '',
          error: undefined as string | undefined
        })).filter(img => img.imageUrl) // Only include successful generations
        
        // If no images generated, return error entry
        if (generatedImages.length === 0) {
          variations.push({
            index: index + 1,
            variation: 1,
            prompt: prompt,
            imageUrl: '',
            error: 'No images generated'
          })
        }
        
        return variations
      } catch (error) {
        console.error(`❌ Error generating image ${index + 1}:`, error)
        return [{
          index: index + 1,
          variation: 1,
          prompt: prompt,
          imageUrl: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      }
    })

    // Wait for all images to complete and flatten the array
    const imageResults = await Promise.all(imageGenerationPromises)
    const generatedImages = imageResults.flat()
    
    console.log(`✅ All images generation completed. Total variations: ${generatedImages.length}, Successful: ${generatedImages.filter(img => img.imageUrl).length}`)
    
    console.log('🎉 Groupon generation completed successfully')

    return NextResponse.json({
      success: true,
      content: generatedContent,
      prompts: parsedResponse.prompts,
      images: generatedImages,
      threadId: runStatus.thread_id,
      aspectRatio: '16:9',
      assistantId: ASSISTANT_ID,
      totalImages: generatedImages.length,
      successfulImages: generatedImages.filter(img => img.imageUrl).length
    })

  } catch (error) {
    console.error('❌ Groupon generation error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate Groupon content',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
