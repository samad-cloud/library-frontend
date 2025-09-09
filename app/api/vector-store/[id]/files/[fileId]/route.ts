import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/vector_stores'

interface VectorStoreFile {
  id: string
  object: string
  created_at: number
  vector_store_id: string
  status: string
  last_error: string | null
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string; fileId: string }> }
) {
  const params = await props.params
  const { id, fileId } = params
  if (!id || !fileId) {
    return NextResponse.json({ error: 'Vector store ID and file ID are required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/${id}/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v1'
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error (${response.status}):`, errorText)
      throw new Error(`OpenAI API returned ${response.status}`)
    }

    const data: VectorStoreFile = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching vector store file:', error)
    return NextResponse.json({ error: 'Failed to fetch vector store file' }, { status: 500 })
  }
}