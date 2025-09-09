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
interface VectorStoreFileResponse {
  id:string,
  object:string,
  created_at:number,
  vector_store_id:string,
}
interface VectorStoreFilesResponse {
  object: string
  data: VectorStoreFileResponse[]
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'Vector store ID is required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/${id}/files`, {
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

    const data: VectorStoreFilesResponse = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching vector store files:', error)
    return NextResponse.json({ error: 'Failed to fetch vector store files' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'Vector store ID is required' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    
    const response = await fetch(`${OPENAI_API_URL}/${id}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error (${response.status}):`, errorText)
      throw new Error(`OpenAI API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error uploading file to vector store:', error)
    return NextResponse.json({ error: 'Failed to upload file to vector store' }, { status: 500 })
  }
}