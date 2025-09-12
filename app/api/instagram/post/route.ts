import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@/utils/supabase/client'
import { pickAccount } from '@/lib/instagram-accounts'

interface InstagramPostRequest {
  caption: string
  model: string
  accountId?: string
  imageUrl?: string
  imageBase64?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: InstagramPostRequest = await request.json()
    const { caption, model, accountId, imageUrl, imageBase64 } = body

    if (!caption) {
      return NextResponse.json(
        { error: 'Caption is required' },
        { status: 400 }
      )
    }

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'Either imageUrl or imageBase64 is required' },
        { status: 400 }
      )
    }

    // Debug what arrived
    console.log('🟡 Instagram post request:', { 
      caption: caption.substring(0, 50) + '...', 
      model, 
      accountId: typeof accountId, 
      hasImageUrl: !!imageUrl, 
      hasImageBase64: !!imageBase64 
    })

    // 1) Resolve account (accepts page_id, ig_user_id, username, name; defaults to is_default)
    const selectedAccount = pickAccount(accountId)
    if (!selectedAccount) {
      return NextResponse.json({
        error: 'Selected Instagram account not found.',
        expected_one_of: {
          note: 'Use page_id, ig_user_id, username, or name to select account'
        },
        got: accountId
      }, { status: 400 })
    }

    const accessToken = selectedAccount.access_token
    const targetUserId = selectedAccount.ig_user_id

    if (!targetUserId) {
      return NextResponse.json({
        error: 'ig_user_id missing for this account. Fill it before posting.'
      }, { status: 400 })
    }

    console.log('📱 Using Instagram API v22.0')
    console.log('📱 Selected Account:', selectedAccount.name)
    console.log('👤 IG User ID:', targetUserId)

    let finalImageUrl = imageUrl

    // 2) If base64 provided, upload to Supabase first
    if (imageBase64 && !imageUrl) {
      console.log('📤 Uploading base64 image to Supabase for Instagram posting...')
      
      const supabase = createClient()
      
      // Convert base64 to buffer
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `instagram-post/${timestamp}-${Math.random().toString(36).substring(2, 15)}.png`

      const { error: uploadError } = await supabase.storage
        .from('image-main')
        .upload(filename, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Supabase upload error:', uploadError)
        return NextResponse.json({
          error: 'Failed to upload image for Instagram posting'
        }, { status: 500 })
      }

      const { data: urlData } = supabase.storage
        .from('image-main')
        .getPublicUrl(filename)

      finalImageUrl = urlData.publicUrl
      console.log('✅ Image uploaded to Supabase:', finalImageUrl)
    }

    // 2b) If imageUrl provided, also copy it to instagram-post directory for consistency
    if (imageUrl && !imageBase64) {
      console.log('📤 Copying image to instagram-post directory...')
      
      try {
        const supabase = createClient()
        
        // Fetch the original image
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`)
        }
        
        const imageBuffer = await response.arrayBuffer()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `instagram-post/${timestamp}-${Math.random().toString(36).substring(2, 15)}.png`

        const { error: uploadError } = await supabase.storage
          .from('image-main')
          .upload(filename, imageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.warn('⚠️ Failed to copy image to instagram-post directory, using original URL:', uploadError)
          // Continue with original URL if copy fails
        } else {
          const { data: urlData } = supabase.storage
            .from('image-main')
            .getPublicUrl(filename)
          
          finalImageUrl = urlData.publicUrl
          console.log('✅ Image copied to instagram-post directory:', finalImageUrl)
        }
      } catch (copyError) {
        console.warn('⚠️ Failed to copy image to instagram-post directory, using original URL:', copyError)
        // Continue with original URL if copy fails
      }
    }

    if (!finalImageUrl) {
      return NextResponse.json({
        error: 'No valid image URL available'
      }, { status: 400 })
    }

    // 3) Create media container (FORM-ENCODED, not JSON)
    console.log('📦 Creating Instagram media container...')
    const form1 = new URLSearchParams()
    form1.set('image_url', finalImageUrl)
    form1.set('caption', caption)
    form1.set('access_token', accessToken)

    const mediaRes = await axios.post(
      `https://graph.facebook.com/v22.0/${targetUserId}/media`,
      form1,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    const creationId = mediaRes.data.id
    console.log('📦 Media container created:', creationId)

    // 4) Publish
    console.log('📤 Publishing Instagram post...')
    const form2 = new URLSearchParams()
    form2.set('creation_id', creationId)
    form2.set('access_token', accessToken)

    const publishRes = await axios.post(
      `https://graph.facebook.com/v22.0/${targetUserId}/media_publish`,
      form2,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    const postId = publishRes.data.id
    console.log('📤 Post published successfully:', postId)

    return NextResponse.json({ 
      success: true, 
      postId, 
      imageUrl: finalImageUrl, 
      captionLength: caption.length, 
      model: model || 'unknown',
      account: selectedAccount.name
    })
  } catch (error: any) {
    console.error('🔥 Instagram Post Error:', error.response?.data || error.message)

    const fb = error.response?.data?.error
    let msg = error.message || 'Failed to post to Instagram'
    if (fb?.code === 190) msg = 'Page access token expired. Refresh it.'
    else if (fb?.code === 100) msg = 'Invalid IG user id or insufficient permissions.'
    else if (fb?.code === 9004) msg = 'Media download failed. Make sure the image URL is public.'
    else if (fb?.message) msg = fb.message

    return NextResponse.json({
      error: msg,
      fb_error: fb || null
    }, { status: 500 })
  }
}
