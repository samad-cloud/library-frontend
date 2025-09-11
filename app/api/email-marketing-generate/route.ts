import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { removeVectorStoreReferences } from '@/lib/vectorStoreUtils'
type AssistantResponse = {
  prompt: string
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!})

const ASSISTANT_ID = 'asst_tMb6dYkeLo83T67GcdqTmGQL'



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

    console.log('🎯 Starting Email Marketing Generation...')
    console.log('📝 Prompt:', prompt)
    console.log('📐 Aspect Ratio:', aspectRatio)
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
      runStatus = await openai.beta.threads.runs.retrieve( run.id,{thread_id: runStatus.thread_id})
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

    // Parse the assistant's JSON response and extract the prompt
    let parsedResponse: AssistantResponse
    try {
      parsedResponse = JSON.parse(generatedContent)
    } catch (error) {
      // Fallback if JSON parsing fails
      parsedResponse = { prompt: generatedContent }
    }
    
    // Clean the prompt of any remaining vector store references
    const cleanedPrompt = removeVectorStoreReferences(parsedResponse.prompt)
    
    // Always add instruction to avoid text on products
    const finalPrompt = `${cleanedPrompt} There should be no text on the product. The Output should one Single Image without ANY splits `

    console.log('🎨 Generating image with Imagen 4...')
    
    const imageResult = await genAI.models.generateImages({
      model: 'imagen-4.0-generate-preview-06-06',
      prompt: finalPrompt,
      config: {
        numberOfImages: numberOfVariations,
        aspectRatio: aspectRatio
      }
    })

    console.log('✅ Imagen 4 image generation completed')

    // Process all generated images
    const images = []
    if (imageResult?.generatedImages) {
      for (const [index, generatedImage] of imageResult.generatedImages.entries()) {
        let imgBytes = generatedImage?.image?.imageBytes;
        if (imgBytes) {
          const buffer = Buffer.from(imgBytes, "base64");
          images.push({
            index: index + 1,
            variation: 1, // Email marketing only has one prompt, so all are variation 1
            prompt: finalPrompt,
            imageUrl: imgBytes
          })
        }
      }
    }
    
    console.log(`🖼️ Processed ${images.length} generated images from Imagen 4`)
    console.log('🎉 Email marketing generation completed successfully')

    return NextResponse.json({
      success: true,
      content: generatedContent,
      images: images,
      threadId: runStatus.thread_id,
      aspectRatio: aspectRatio,
      assistantId: ASSISTANT_ID,
      totalImages: images.length,
      successfulImages: images.filter(img => img.imageUrl).length
    })

  } catch (error) {
    console.error('❌ Email marketing generation error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate email marketing content',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}