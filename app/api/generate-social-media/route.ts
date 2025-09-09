import { NextRequest, NextResponse } from 'next/server'
import { Runner, Agent, setDefaultOpenAIKey } from '@openai/agents'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import { z } from 'zod'
import socialMediaCaptionInstructions from '@/lib/instructions/social_media_caption'
import socialMediaEnhanceInstructions from '@/lib/instructions/social_media_enhance'

// Load environment variables
dotenv.config()

// Initialize OpenAI key
setDefaultOpenAIKey(process.env.OPENAI_API_KEY!)

// Initialize Google AI client
const googleAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
})

// Zod schema for Social Media Enhanced Prompt
const SocialMediaEnhancedPromptSchema = z.object({
  scene: z.string().describe('A 100-150 word vivid, lifestyle or interior design description'),
  shot_type: z.enum(['wide shot', 'medium shot', 'close up']).describe('Camera shot type'),
  composition: z.string().describe('2-5 words of framing advice'),
  colour_palette: z.string().describe('3-4 descriptive colour words matching country décor trends'),
  aspect_ratio: z.enum(['1:1', '4:5']).describe('Aspect ratio for social media')
})

type SocialMediaEnhancedPrompt = z.infer<typeof SocialMediaEnhancedPromptSchema>

interface SocialMediaGenerationRequest {
  userPrompt: string
  selectedModels?: string[]
  enhanceOnly?: boolean
  skipEnhancement?: boolean
}

interface ModelResult {
  modelName: string
  imageUrls: string[]
  error?: string
}

interface SocialMediaResult {
  caption: string
  enhancedPrompt: SocialMediaEnhancedPrompt
  models: ModelResult[]
  timestamp: string
}

async function generateSocialMediaCaption(sceneDescription: string): Promise<string> {
  console.log('[SOCIAL-MEDIA] Generating caption and tags based on enhanced scene...')
  
  const runner = new Runner()
  const captionAgent = new Agent({
    model: 'gpt-4o',
    name: 'Social Media Caption Generator',
    instructions: socialMediaCaptionInstructions,
  })

  const result = await runner.run(captionAgent, sceneDescription)
  const caption = result.finalOutput || 'Caption generation failed'
  
  console.log('[SOCIAL-MEDIA] Generated caption:', caption)
  return caption
}

async function enhanceSocialMediaPrompt(userPrompt: string): Promise<SocialMediaEnhancedPrompt> {
  console.log('[SOCIAL-MEDIA] Enhancing prompt for image generation...')
  
  const runner = new Runner()
  const enhanceAgent = new Agent({
    name: 'Social Media Prompt Enhancer',
    model: 'gpt-4o',
    instructions: socialMediaEnhanceInstructions,
    outputType: SocialMediaEnhancedPromptSchema
  })

  const result = await runner.run(enhanceAgent, userPrompt)
  
  if (!result.finalOutput) {
    throw new Error('Failed to enhance prompt')
  }

  // The outputType with Zod schema automatically validates and parses the output
  const enhancedPrompt = result.finalOutput as SocialMediaEnhancedPrompt
  
  console.log('[SOCIAL-MEDIA] Enhanced prompt generated:', enhancedPrompt)
  return enhancedPrompt
}

async function generateImagesWithModel(enhancedPrompt: SocialMediaEnhancedPrompt, modelName: string): Promise<Buffer[]> {
  console.log(`[SOCIAL-MEDIA] Generating images with ${modelName}...`)
  
  const fullPrompt = {
    scene: enhancedPrompt.scene,
    shot_type: enhancedPrompt.shot_type,
    composition: enhancedPrompt.composition,
    colour_palette: enhancedPrompt.colour_palette,
  }
  console.log(`[SOCIAL-MEDIA] Using prompt: "${fullPrompt?.scene?.substring(0, 100)}..."`)

  // Map frontend model names to actual model IDs
  const modelMap: { [key: string]: string } = {
    'geminiImagen3': 'imagen-3.0-generate-002',
    'geminiImagen4': 'imagen-4.0-generate-preview-06-06',
    'geminiImagen4Ultra': 'imagen-4.0-generate-preview-06-06' // Using same model for now, can be updated when Ultra is available
  }

  const actualModelId = modelMap[modelName] || 'imagen-4.0-generate-preview-06-06'

  try {
    const response = await googleAI.models.generateImages({
      model: actualModelId,
      prompt: JSON.stringify(fullPrompt),
      config: {
        numberOfImages: 1,
        aspectRatio: enhancedPrompt.aspect_ratio,
      },
      
    })

    const buffers: Buffer[] = []
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      for (const generatedImage of response.generatedImages) {
        if (generatedImage.image?.imageBytes) {
          const buffer = Buffer.from(generatedImage.image.imageBytes, "base64")
          buffers.push(buffer)
        }
      }
    }

    console.log(`[SOCIAL-MEDIA] Generated ${buffers.length} images successfully with ${modelName}`)
    return buffers
  } catch (error) {
    console.error(`[SOCIAL-MEDIA] Error generating images with ${modelName}:`, error)
    throw error
  }
}

async function convertImagesToDataUrls(imageBuffers: Buffer[], modelName: string): Promise<string[]> {
  console.log(`[SOCIAL-MEDIA] Converting ${imageBuffers.length} images to data URLs for ${modelName}...`)
  
  const dataUrls = imageBuffers.map((buffer, index) => {
    // Convert buffer to base64 data URL
    const base64 = buffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`
    
    // Log without the actual base64 content
    // console.log(`[SOCIAL-MEDIA] Converted ${modelName} image ${index + 1} (${Math.round(buffer.length / 1024)}KB)`)
    return dataUrl
  })

  console.log(`[SOCIAL-MEDIA] All ${dataUrls.length} ${modelName} images converted successfully`)
  return dataUrls
}

async function generateSocialMediaContent(userPrompt: string, selectedModels?: string[], enhanceOnly?: boolean, skipEnhancement?: boolean): Promise<SocialMediaResult> {
  console.log('[SOCIAL-MEDIA] Starting social media content generation...')
  console.log('[SOCIAL-MEDIA] User prompt:', userPrompt)
  
  // Default models if none selected
  const modelsToUse = selectedModels && selectedModels.length > 0 
    ? selectedModels 
    : ['geminiImagen3', 'geminiImagen4', 'geminiImagen4Ultra']
  
  console.log('[SOCIAL-MEDIA] Selected models:', modelsToUse)
  
  const startTime = Date.now()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  try {
    // Step 1: Handle prompt enhancement
    let enhancedPrompt: SocialMediaEnhancedPrompt
    
    if (skipEnhancement) {
      console.log('[SOCIAL-MEDIA] Skipping enhancement - using provided prompt as scene...')
      // Create a simple enhanced prompt object using the provided prompt
      enhancedPrompt = {
        scene: userPrompt,
        shot_type: 'wide shot',
        composition: 'balanced composition',
        colour_palette: 'natural warm tones',
        aspect_ratio: '1:1'
      }
    } else {
      console.log('[SOCIAL-MEDIA] Step 1: Enhancing user prompt for image generation...')
      enhancedPrompt = await enhanceSocialMediaPrompt(userPrompt)
    }

    // If only enhancing prompt, return early
    if (enhanceOnly) {
      console.log('[SOCIAL-MEDIA] Enhance-only mode: returning enhanced prompt')
      return {
        caption: '',
        enhancedPrompt,
        models: [],
        timestamp
      }
    }

    // Step 2: Generate caption and tags based on the enhanced prompt
    console.log('[SOCIAL-MEDIA] Step 2: Generating caption and tags based on enhanced scene...')
    const caption = await generateSocialMediaCaption(enhancedPrompt.scene)

    // Step 3: Generate images with selected models
    console.log('[SOCIAL-MEDIA] Step 3: Generating images with selected models...')
    const modelResults: ModelResult[] = []
    
    for (const modelName of modelsToUse) {
      try {
        console.log(`[SOCIAL-MEDIA] Generating with ${modelName}...`)
        const imageBuffers = await generateImagesWithModel(enhancedPrompt, modelName)
        
        if (imageBuffers.length === 0) {
          modelResults.push({
            modelName,
            imageUrls: [],
            error: 'No images were generated'
          })
          continue
        }

        // Step 4: Convert images to data URLs for display
        const imageUrls = await convertImagesToDataUrls(imageBuffers, modelName)

        modelResults.push({
          modelName,
          imageUrls
        })

      } catch (modelError) {
        console.error(`[SOCIAL-MEDIA] Error generating with ${modelName}:`, modelError)
        modelResults.push({
          modelName,
          imageUrls: [],
          error: modelError instanceof Error ? modelError.message : 'Unknown error'
        })
      }
    }

    const totalTime = (Date.now() - startTime) / 1000
    console.log(`[SOCIAL-MEDIA] Content generation completed in ${totalTime.toFixed(2)} seconds`)

    const result: SocialMediaResult = {
      caption,
      enhancedPrompt,
      models: modelResults,
      timestamp
    }

    // Log the complete result
    console.log('\n=== SOCIAL MEDIA CONTENT GENERATED ===')
    console.log('Caption & Tags:')
    console.log(result.caption)
    console.log('\nEnhanced Prompt:', JSON.stringify(result.enhancedPrompt, null, 2))
    console.log('\nGenerated Images by Model:')
    result.models.forEach((model) => {
      console.log(`  ${model.modelName}: ${model.imageUrls.length} images${model.error ? ` (Error: ${model.error})` : ''}`)
      model.imageUrls.forEach((url, index) => {
        const urlPreview = url.substring(0, 50) + '...' + ` (${Math.round((url.length - 22) * 0.75 / 1024)}KB)`
        console.log(`    ${index + 1}. ${urlPreview}`)
      })
    })
    console.log('=====================================\n')

    return result

  } catch (error) {
    console.error('[SOCIAL-MEDIA] Error in social media workflow:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SocialMediaGenerationRequest = await request.json()

    if (!body.userPrompt) {
      return NextResponse.json(
        { error: 'userPrompt is required' },
        { status: 400 }
      )
    }

    // Generate social media content
    const result = await generateSocialMediaContent(body.userPrompt, body.selectedModels, body.enhanceOnly, body.skipEnhancement)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Social media generation error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
