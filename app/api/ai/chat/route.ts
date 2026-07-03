import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAIContext, resolveDateRange } from '@/lib/ai/context'
import { getCachedContext, setCachedContext, isRateLimited } from '@/lib/ai/cache'
import { AI_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'

const MAX_MESSAGE_LENGTH = 500
const SECRET_REQUEST_RE = /\b(api[\s_-]?key|secret|token|password|env var|environment variable|credential|service[\s_-]?role)\b/i

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment before asking again.' }, { status: 429 })
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'No workspace found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 400 })
  }

  // Never forward requests that are fishing for secrets to the model at all.
  if (SECRET_REQUEST_RE.test(message)) {
    return NextResponse.json({
      answer: "I can't share API keys, tokens, passwords, or environment variables. Ask me about your store's revenue, orders, ads, courier performance, or inventory instead.",
    })
  }

  const range = resolveDateRange(body?.from, body?.to)
  const cacheKey = `${member.workspace_id}:${range.from}:${range.to}`
  let context = getCachedContext(cacheKey)
  if (!context) {
    context = await buildAIContext(supabase, member.workspace_id, range)
    setCachedContext(cacheKey, context)
  }

  const apiKey = process.env.AI_API_KEY
  const apiUrl = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions'
  const model = process.env.AI_MODEL || 'openai/gpt-oss-120b'

  if (!apiKey) {
    return NextResponse.json({ error: 'AI assistant is not configured. Set AI_API_KEY on the server.' }, { status: 500 })
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_completion_tokens: 900,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'system', content: `Dashboard context (JSON, only source of truth for numbers):\n${JSON.stringify(context)}` },
          { role: 'user', content: message },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return NextResponse.json({ error: `AI service error: ${response.status} ${errText}`.slice(0, 300) }, { status: 502 })
    }

    const data = await response.json()
    const answer = data?.choices?.[0]?.message?.content?.trim()

    if (!answer) {
      return NextResponse.json({ error: 'AI service returned an empty response.' }, { status: 502 })
    }

    return NextResponse.json({ answer, dateRange: range.label })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to reach the AI service.' }, { status: 502 })
  }
}
