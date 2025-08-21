// app/api/echo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL_SLACK!,
  // Use the **service role** key on the server only
    process.env.SUPABASE_SERVICE_KEY_SLACK!,
  { auth: { persistSession: false } }
)

/** Slack ts ("1755672995.774219") -> ISO UTC */
function tsToISO(ts?: string | null) {
  if (!ts) return null
  const ms = Math.round(parseFloat(ts) * 1000)
  return new Date(ms).toISOString()
}

/** Accept the two possible shapes and return a clean messages[] */
function extractMessages(body: any): Array<{text:string; user?:string|null; ts?:string|null; permalink?:string|null}> {
  // Case A: already { source, messages: [...] }
  if (Array.isArray(body?.messages)) return body.messages

  // Case B: Zapier sent { texts: "<JSON string>" }
  if (typeof body?.texts === 'string') {
    try {
      const parsed = JSON.parse(body.texts)
      if (Array.isArray(parsed?.messages)) return parsed.messages
    } catch { /* fall through */ }
  }

  // Case C: three comma-joined strings (fallback)
  if (typeof body?.texts === 'string' && typeof body?.users === 'string' && typeof body?.ts === 'string') {
    const texts = body.texts.split(',').map((s: string) => s.trim())
    const users = body.users.split(',').map((s: string) => s.trim())
    const tss   = body.ts.split(',').map((s: string) => s.trim())
    const len = Math.max(texts.length, users.length, tss.length)
    return Array.from({ length: len }, (_, i) => ({
      text: texts[i] ?? '',
      user: users[i] ?? null,
      ts:   tss[i]   ?? null,
      permalink: null,
    }))
  }

  return []
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // normalize messages
    const rawMessages = extractMessages(body)
    const rows = rawMessages
      .filter(m => (m?.text ?? '').trim().length > 0) // skip blank messages
      .map(m => ({
        text: (m.text ?? '').trim(),
        user_id: m.user ?? null,
        ts: tsToISO(m.ts ?? null),
        permalink: m.permalink ?? null
      }))

    // write to Supabase (upsert on user_id+ts to avoid dups)
    const { error } = await supabase
      .from('slack_messages')
      .upsert(rows, { onConflict: 'user_id,ts' })

    if (error) {
      console.error('supabase upsert error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      inserted: rows.length
    })
  } catch (err: any) {
    console.error('Echo API error:', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 400 })
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
