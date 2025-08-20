import { NextRequest, NextResponse } from 'next/server'

/**
 * Public API endpoint that returns the exact data sent to it
 * POST /api/echo
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    
    // Get headers (excluding sensitive ones)
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      // Only include non-sensitive headers
      if (!key.toLowerCase().includes('authorization') && 
          !key.toLowerCase().includes('cookie') && 
          !key.toLowerCase().includes('session')) {
        headers[key] = value
      }
    })

    // Create response data with the exact body plus some metadata
    const responseData = {
      message: "Echo API - returning your data",
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers: headers,
      body: body,
      queryParams: Object.fromEntries(request.nextUrl.searchParams.entries())
    }

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('Echo API error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
