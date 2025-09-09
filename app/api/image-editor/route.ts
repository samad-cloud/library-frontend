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

interface EditRequest {
  imageBase64: string
  instruction: string
  conversationHistory?: ChatMessage[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, instruction, conversationHistory = [] }: EditRequest = body

    if (!imageBase64?.trim()) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    if (!instruction?.trim()) {
      return NextResponse.json(
        { error: 'Editing instruction is required' },
        { status: 400 }
      )
    }

    console.log('🎨 Starting Nano Banana image editing...')
    console.log('📝 Instruction:', instruction.substring(0, 100) + '...')
    console.log('🗂️ Conversation history:', conversationHistory.length, 'messages')

    // Build context from conversation history
    let contextPrompt = ''
    if (conversationHistory.length > 0) {
      contextPrompt = '\n\nPrevious conversation context:\n'
      conversationHistory.slice(-5).forEach((msg, index) => {
        if (msg.role === 'user') {
          contextPrompt += `User: ${msg.content}\n`
        } else if (msg.role === 'assistant') {
          contextPrompt += `Assistant: ${msg.content}\n`
        }
      })
      contextPrompt += '\nNow apply this new instruction:\n'
    }

    // Prepare the editing prompt for Nano Banana
    const editingPrompt = `${instruction}`

    // Prepare the content for Nano Banana
    const editPrompt = [
      { text: editingPrompt },
      {
        inlineData: {
          mimeType: "image/png",
          data: imageBase64
        }
      }
    ]
    
    console.log('🍌 Sending request to Nano Banana...')
    
    const nanoBananaResult = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: editPrompt,
    })

    console.log('✅ Nano Banana processing completed')

    // Extract the response from Nano Banana
    let responseText = ''
    let editedImageBase64: string | null = null
    
    const parts = nanoBananaResult?.candidates?.[0]?.content?.parts || []
    
    for (const part of parts) {
      if (part.text) {
        responseText += part.text
      } else if (part.inlineData?.data) {
        // If Nano Banana returns an edited image
        const imageData = part.inlineData.data
        editedImageBase64 = imageData
        console.log('🖼️ Received edited image from Nano Banana')
      }
    }

    // If no image was returned, Nano Banana provided text instructions only
    if (!editedImageBase64 && responseText) {
      console.log('📝 Nano Banana provided text instructions only')
      responseText += '\n\nNote: This edit requires manual implementation or may need to be processed through an image generation model for the actual visual changes.'
    }

    // Create response message
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: responseText || 'I\'ve analyzed your image and editing request.',
      imageUrl: editedImageBase64 ? `data:image/png;base64,${editedImageBase64}` : undefined,
      timestamp: Date.now()
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      hasEditedImage: !!editedImageBase64,
      instructions: responseText
    })

  } catch (error) {
    console.error('❌ Image editing error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to edit image',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// Helper endpoint to get conversation history (if we want to persist conversations)
export async function GET(request: NextRequest) {
  try {
    // This could be extended to retrieve conversation history from a database
    // For now, return empty history as conversations are client-side only
    return NextResponse.json({
      success: true,
      conversations: []
    })
  } catch (error) {
    console.error('❌ Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
