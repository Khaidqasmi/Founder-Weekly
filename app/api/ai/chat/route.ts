import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAIContext, resolveDateRange, resolveDateRangeForDays } from '@/lib/ai/context'
import { getCachedContext, setCachedContext, isRateLimited } from '@/lib/ai/cache'
import { AI_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { sanitizeAIAnswer } from '@/lib/ai/format'
import { parseExplicitDateRangeFromMessage, parseRangeDaysFromMessage } from '@/lib/ai/parse-range'
import { AI_TOOLS } from '@/lib/ai/tools'
import { queryWorkspaceData } from '@/lib/ai/db-reader'

const MAX_MESSAGE_LENGTH = 500
const SECRET_REQUEST_RE = /\b(api[\s_-]?key|secret|token|password|env var|environment variable|credential|service[\s_-]?role)\b/i
const MAX_TOOL_ROUNDS = 3

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

  // Priority: an explicit range from the dashboard's current filter, then a
  // period mentioned in the question itself ("90 day summary"), then the
  // 7-day default. Without this, questions about longer periods than the
  // client happened to send would always look like "no data" even though
  // the workspace has it.
  const parsedExplicitRange = !body?.from && !body?.to ? parseExplicitDateRangeFromMessage(message) : null
  const parsedDays = !body?.from && !body?.to && !parsedExplicitRange ? parseRangeDaysFromMessage(message) : null
  const range = parsedExplicitRange || (parsedDays !== null ? resolveDateRangeForDays(parsedDays) : resolveDateRange(body?.from, body?.to))
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

  const messages: any[] = [
    { role: 'system', content: AI_SYSTEM_PROMPT },
    { role: 'system', content: `Dashboard context (JSON, only source of truth for numbers):\n${JSON.stringify(context)}` },
    { role: 'user', content: message },
  ]

  try {
    let rawAnswer: string | undefined

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_completion_tokens: 900,
          messages,
          tools: AI_TOOLS,
          tool_choice: 'auto',
        }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        return NextResponse.json({ error: `AI service error: ${response.status} ${errText}`.slice(0, 300) }, { status: 502 })
      }

      const data = await response.json()
      const choice = data?.choices?.[0]?.message

      if (!choice) {
        return NextResponse.json({ error: 'AI service returned an empty response.' }, { status: 502 })
      }

      const toolCalls = choice.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined

      if (!toolCalls || toolCalls.length === 0) {
        rawAnswer = choice.content?.trim()
        break
      }

      // Model wants to read more data. Execute each requested lookup through
      // the locked-down, workspace-scoped reader — the model's arguments are
      // only ever used to pick a table/date range/limit, never to bypass the
      // workspace_id filter or reach a table outside the allow-list.
      messages.push({ role: 'assistant', content: choice.content || null, tool_calls: toolCalls })

      for (const call of toolCalls) {
        let args: any = {}
        try {
          args = JSON.parse(call.function.arguments || '{}')
        } catch {
          args = {}
        }

        const result = await queryWorkspaceData(supabase, member.workspace_id, {
          table: String(args.table || ''),
          from: typeof args.from === 'string' ? args.from : undefined,
          to: typeof args.to === 'string' ? args.to : undefined,
          limit: typeof args.limit === 'number' ? args.limit : undefined,
        })

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }
    }

    if (!rawAnswer) {
      return NextResponse.json({ error: 'AI service did not return a final answer in time.' }, { status: 502 })
    }

    return NextResponse.json({ answer: sanitizeAIAnswer(rawAnswer), dateRange: range.label })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to reach the AI service.' }, { status: 502 })
  }
}
