import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/vector_stores'

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Vector store ID is required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/${id}`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching vector store:', error)
    return NextResponse.json({ error: 'Failed to fetch vector store' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Vector store ID is required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vector store:', error)
    return NextResponse.json({ error: 'Failed to delete vector store' }, { status: 500 })
  }
}