import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const generator = searchParams.get('generator')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query using the existing images table
    let query = supabase
      .from('images')
      .select('*')
      .eq('generation_source', 'manual')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by generator if specified
    if (generator && ['social-media', 'email-marketing', 'google-sem', 'groupon'].includes(generator)) {
      query = query.contains('generation_metadata', { generator_type: generator })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching saved images:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved images' },
        { status: 500 }
      )
    }

    // Images already have storage_url in the table
    const imagesWithUrls = data.map((image: any) => ({
      ...image,
      public_url: image.storage_url
    }))

    return NextResponse.json({
      images: imagesWithUrls,
      total: data.length,
      hasMore: data.length === limit
    })

  } catch (error) {
    console.error('Error in saved-images API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { imageId } = await request.json()
    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    // Get the image record to get storage path
    const { data: imageRecord, error: fetchError } = await supabase
      .from('images')
      .select('generation_metadata, storage_url')
      .eq('id', imageId)
      .eq('generation_source', 'manual')
      .single()

    if (fetchError || !imageRecord) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Delete from storage if storage_path exists in metadata
    const storagePath = imageRecord.generation_metadata?.storage_path
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('image-main')
        .remove([storagePath])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)
      .eq('generation_source', 'manual')

    if (dbError) {
      console.error('Error deleting from database:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in saved-images DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
