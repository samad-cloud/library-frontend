import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!})

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  timestamp: number
}

interface CreateRequest {
  prompt: string
  conversationHistory?: ChatMessage[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, conversationHistory = [] }: CreateRequest = body

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('🎨 Starting image creation with Nano Banana...')
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...')
    console.log('🗂️ Conversation history:', conversationHistory.length, 'messages')

    // Build context from conversation history for better continuity
    let contextPrompt = prompt
    if (conversationHistory.length > 0) {
      const recentContext = conversationHistory.slice(-3).map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n')
      contextPrompt = `Context from conversation:\n${recentContext}\n\nNew request: ${prompt}`
    }

    console.log('🍌 Sending creation request to Nano Banana...')
    
    // Use Nano Banana for image creation
    const nanoBananaResult = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: contextPrompt,
    })

    console.log('✅ Image creation completed')

    // Extract the response from Nano Banana
    let responseText = ''
    let createdImageBase64: string | null = null
    
    const parts = nanoBananaResult?.candidates?.[0]?.content?.parts || []
    
    for (const part of parts) {
      if (part.text) {
        responseText += part.text
      } else if (part.inlineData?.data) {
        // Nano Banana returned the created image
        const imageData = part.inlineData.data
        createdImageBase64 = imageData
        console.log('🖼️ Received created image from Nano Banana')
      }
    }

    // Create response message
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: responseText || `I've created an image based on your description: "${prompt}"`,
      imageUrl: createdImageBase64 ? `data:image/png;base64,${createdImageBase64}` : undefined,
      timestamp: Date.now()
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      hasCreatedImage: !!createdImageBase64
    })

  } catch (error) {
    console.error('❌ Image creation error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create image',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
