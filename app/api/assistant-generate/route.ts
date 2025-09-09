import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { removeVectorStoreReferences } from '@/lib/vectorStoreUtils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!})

// Default assistant ID - can be overridden in request
const DEFAULT_ASSISTANT_ID = 'asst_tMb6dYkeLo83T67GcdqTmGQL'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      assistantId = DEFAULT_ASSISTANT_ID,
      prompt, 
      aspectRatio = '1:1',
      skipImageGeneration = false,
      userId // For tracking purposes, but minimal storage
    } = body

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('🤖 Assistant Generate Request:', {
      assistantId: assistantId.substring(0, 10) + '...',
      promptLength: prompt.length,
      aspectRatio,
      skipImageGeneration
    })

    // Step 1: Create and Run Thread with Assistant
    const run = await openai.beta.threads.createAndRun({
      assistant_id: assistantId,
      thread: {
        messages: [
          { role: 'user', content: prompt }
        ]
      }
    })

    // Step 2: Poll for completion with timeout
    let runStatus = run
    let pollCount = 0
    const maxPolls = 60 // 1 minute timeout
    
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

    // Step 3: Get Response
    const messages = await openai.beta.threads.messages.list(runStatus.thread_id)
    const assistantMessage = messages.data.find(m => m.role === 'assistant')
    
    if (!assistantMessage?.content[0] || assistantMessage.content[0].type !== 'text') {
      throw new Error('No valid response from assistant')
    }

    const rawGeneratedContent = assistantMessage.content[0].text.value
    const generatedContent = removeVectorStoreReferences(rawGeneratedContent)

    let imageUrl: string | null = null

    // Step 4: Generate Image (if requested)
    if (!skipImageGeneration) {
      try {
        // Try to parse as JSON first (for structured outputs)
        let imagePrompt = generatedContent
        try {
          const parsed = JSON.parse(generatedContent)
          // If it's a structured response, use the whole JSON as prompt
          imagePrompt = JSON.stringify(parsed)
        } catch {
          // If not JSON, use the content directly
          imagePrompt = generatedContent
        }

        const imageResult = await genAI.models.generateImages({
          model: 'imagen-4.0-generate-preview-06-06',
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio
          }
        })

        imageUrl = imageResult?.generatedImages?.[0]?.image?.imageBytes || null
        
        if (imageUrl) {
          console.log('✅ Image generated successfully')
        }
      } catch (imageError) {
        console.error('⚠️ Image generation failed, continuing without image:', imageError)
        // Continue without image rather than failing the whole request
      }
    }

    // Return minimal response to reduce egress
    const response = {
      success: true,
      content: generatedContent,
      imageUrl: imageUrl,
      threadId: runStatus.thread_id,
      assistantId: assistantId,
      aspectRatio: aspectRatio,
      // Minimal metadata
      metadata: {
        processedAt: new Date().toISOString(),
        promptLength: prompt.length,
        hasImage: !!imageUrl
      }
    }

    console.log('🎉 Assistant generation completed successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Assistant generation error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate content',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
