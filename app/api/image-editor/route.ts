import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!})

// Constants for payload optimization
const MAX_PAYLOAD_SIZE_MB = 8 // Vercel's limit is 10MB, we use 8MB for safety
const MAX_IMAGE_SIZE_MB = 5 // Maximum individual image size in MB
const MAX_IMAGE_DIMENSION = 2048 // Maximum width/height for processing (increased for larger images)

interface EditRequest {
  imageBase64: string
  instruction: string
}

// Utility function to estimate payload size in MB
function estimatePayloadSizeMB(payload: any): number {
  const jsonString = JSON.stringify(payload)
  const sizeInBytes = new TextEncoder().encode(jsonString).length
  return sizeInBytes / (1024 * 1024)
}

// Simplified to direct image + prompt processing (no conversation history)

// Server-side image dimension estimation (basic)
function estimateImageDimensions(base64: string): { estimated: boolean, shouldCompress: boolean } {
  // Estimate dimensions based on base64 length
  // Base64 encoding increases size by ~33%, and each pixel takes ~4 bytes (RGBA)
  const base64Length = base64.length
  const estimatedBytes = (base64Length * 3) / 4 // Approximate original size
  const estimatedPixels = estimatedBytes / 4 // Assume RGBA
  const estimatedDimension = Math.sqrt(estimatedPixels)
  
  return {
    estimated: true,
    shouldCompress: estimatedDimension > MAX_IMAGE_DIMENSION || estimatedBytes > MAX_IMAGE_SIZE_MB * 1024 * 1024 // Use configurable limit
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, instruction }: EditRequest = body

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

    // Check payload size (simplified without conversation history)
    const payloadSize = estimatePayloadSizeMB({ imageBase64, instruction })
    console.log(`📊 Payload size: ${payloadSize.toFixed(2)}MB`)

    // Check if image is too large
    const imageAnalysis = estimateImageDimensions(imageBase64)
    if (imageAnalysis.shouldCompress) {
      return NextResponse.json(
        { 
          error: 'Image too large', 
          message: `Please use a smaller image (max ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels or ${MAX_IMAGE_SIZE_MB}MB). Consider resizing your image before uploading.`,
          suggestedAction: 'resize_image'
        },
        { status: 413 }
      )
    }

    // Final payload size check
    if (payloadSize > MAX_PAYLOAD_SIZE_MB) {
      return NextResponse.json(
        { 
          error: 'Request too large', 
          message: `Payload size (${payloadSize.toFixed(2)}MB) exceeds limit (${MAX_PAYLOAD_SIZE_MB}MB). Please use a smaller image.`,
          currentSize: payloadSize,
          maxSize: MAX_PAYLOAD_SIZE_MB
        },
        { status: 413 }
      )
    }

    console.log('🎨 Starting Nano Banana image editing...')
    console.log('📝 Instruction:', instruction.substring(0, 100) + '...')
    console.log('🖼️ Processing image directly with Nano Banana')

    // Use the instruction directly without conversation history
    const editingPrompt = instruction

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

    // Return simplified response without conversation structure
    return NextResponse.json({
      success: true,
      hasEditedImage: !!editedImageBase64,
      editedImageBase64: editedImageBase64,
      editedImageUrl: editedImageBase64 ? `data:image/png;base64,${editedImageBase64}` : undefined,
      instructions: responseText || 'Image editing completed.',
      timestamp: Date.now()
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
