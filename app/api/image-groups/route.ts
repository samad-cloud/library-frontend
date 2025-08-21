import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'

interface GenerationGroup {
  generation_id: string | null
  trigger: string
  source: string
  status: string
  created_at: string
  all_tags: string[]
  images: any[]
  total_group_count: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || null
    const source = searchParams.get('source') || null
    const status = searchParams.get('status') || null
    const tagsParam = searchParams.get('tags')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Parse tags array
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : null

    // Calculate offset
    const offset = (page - 1) * limit

    // Create Supabase client
    const supabase = await createClient()

    console.log('📡 Fetching generation groups with params:', {
      page,
      limit,
      offset,
      search,
      source,
      status,
      tags,
      sortBy,
      sortOrder
    })

    // Call the RPC function
    const { data, error } = await supabase.rpc('get_generation_groups_v1', {
      p_search_term: search,
      p_source_filter: source,
      p_status_filter: status,
      p_tags_filter: tags,
      p_sort_by: sortBy,
      p_sort_dir: sortOrder,
      p_limit_count: limit,
      p_offset_count: offset
    })

    if (error) {
      console.error('❌ Supabase RPC error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch generation groups', details: error.message },
        { status: 500 }
      )
    }

    // Extract total count from first row (all rows have same total_group_count)
    const totalCount = data && data.length > 0 ? data[0].total_group_count : 0
    
    // Transform data to match expected format
    const groups: GenerationGroup[] = (data || []).map((row: any) => ({
      generation_id: row.generation_id,
      trigger: row.trigger,
      source: row.source,
      status: row.status,
      created_at: row.created_at,
      all_tags: row.all_tags || [],
      images: row.images || [],
      total_group_count: row.total_group_count
    }))

    console.log(`✅ Fetched ${groups.length} groups (total: ${totalCount})`)

    return NextResponse.json({
      groups,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    })

  } catch (error) {
    console.error('❌ API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
