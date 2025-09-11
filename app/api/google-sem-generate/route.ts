import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { removeVectorStoreReferences } from '@/lib/vectorStoreUtils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})
type AssistantResponse = {
  prompt: string
}
const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!})

const ASSISTANT_ID = 'asst_4nGR0L10K8L2NOAJ7IlBksvx'



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

    console.log('🎯 Starting Google SEM Generation...')
    console.log('📝 Prompt:', prompt)
    console.log('📐 Aspect Ratio:', aspectRatio)

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
    console.log(run)
    // Poll for completion
    let runStatus = run
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      const resp = await openai.beta.threads.runs.retrieve(runStatus.id,{thread_id: runStatus.thread_id})
      runStatus = resp
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

    // Step 5: Generate Original Image with Imagen 4
    console.log('🎨 Generating original image with Imagen 4...')
    
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
    const finalPrompt = `${cleanedPrompt}. There should be no text on the product.`
    
    const imageResult = await genAI.models.generateImages({
      model: 'imagen-4.0-generate-preview-06-06',
      prompt: finalPrompt,
      config: {
        numberOfImages: numberOfVariations,
        aspectRatio: aspectRatio
      }
    })

    console.log('✅ Original images generated successfully')

    // Process all generated images
    const images = []
    if (imageResult?.generatedImages) {
      for (const [index, generatedImage] of imageResult.generatedImages.entries()) {
        let imgBytes = generatedImage?.image?.imageBytes;
        if (imgBytes) {
          const buffer = Buffer.from(imgBytes, "base64");

          // Step 6: Convert to Google Ads format using Nano Banana
          console.log(`🍌 Converting image ${index + 1} to Google Ads format with Nano Banana...`)
          
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
}

    `
    
          const edit_prompt = [
            { text: googleAdsPrompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: imgBytes
              }
            }
          ]
    
          try {
            const nanoBananaResult = await genAI.models.generateContent({
              model: 'gemini-2.5-flash-image-preview',
              contents: [{
                role: 'user',
                parts: edit_prompt
              }],
            })

            let googleAdsImageUrl = ''
            
            if (nanoBananaResult?.candidates?.[0]?.content?.parts) {
              for (const part of nanoBananaResult.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.mimeType?.includes('image')) {
                  googleAdsImageUrl = part.inlineData.data || ''
                  break
                }
              }
            }

            if (!googleAdsImageUrl) {
              console.log(`⚠️ Nano Banana conversion failed for image ${index + 1}, using original image`)
              googleAdsImageUrl = imgBytes
            }

            // Add original image
            images.push({
              index: (index * 2) + 1,
              variation: 1,
              prompt: finalPrompt,
              imageUrl: imgBytes,
              type: 'original'
            })

            // Add Google Ads version
            images.push({
              index: (index * 2) + 2,
              variation: 1,
              prompt: `Google Ads version: ${finalPrompt}`,
              imageUrl: googleAdsImageUrl,
              type: 'google_ads'
            })

            console.log(`✅ Image ${index + 1} processing completed successfully`)
            
          } catch (error) {
            console.error(`❌ Error processing image ${index + 1}:`, error)
            // Still add the original image even if conversion fails
            images.push({
              index: (index * 2) + 1,
              variation: 1,
              prompt: finalPrompt,
              imageUrl: imgBytes,
              type: 'original'
            })
            images.push({
              index: (index * 2) + 2,
              variation: 1,
              prompt: `Google Ads version: ${finalPrompt}`,
              imageUrl: imgBytes, // Use original as fallback
              type: 'google_ads',
              error: 'Conversion failed, showing original'
            })
          }
        }
      }
    }
    
    console.log(`🖼️ Processed ${images.length} images (${images.length / 2} originals + ${images.length / 2} Google Ads versions)`)
    console.log('🎉 Google SEM generation completed successfully')

    return NextResponse.json({
      success: true,
      content: generatedContent,
      images: images,
      threadId: runStatus.thread_id,
      aspectRatio: aspectRatio,
      totalImages: images.length,
      successfulImages: images.filter(img => img.imageUrl).length
    })

  } catch (error) {
    console.error('❌ Google SEM generation error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate Google SEM content',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}