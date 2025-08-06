import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/vector_stores'

interface FileContent {
  file_id: string
  filename: string
  attributes: Record<string, any>
  content: Array<{
    type: string
    text: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  const { id, fileId } = await params
  if (!id || !fileId) {
    return NextResponse.json({ error: 'Vector store ID and file ID are required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/${id}/files/${fileId}/content`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error (${response.status}):`, errorText)
      throw new Error(`OpenAI API returned ${response.status}`)
    }

    const data: FileContent = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching file content:', error)
    return NextResponse.json({ error: 'Failed to fetch file content' }, { status: 500 })
  }
}