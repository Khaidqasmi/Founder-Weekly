import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAIContext, resolveDateRange } from '@/lib/ai/context'
import { getCachedContext, setCachedContext } from '@/lib/ai/cache'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'No workspace found' }, { status: 404 })

  const url = new URL(request.url)
  const range = resolveDateRange(url.searchParams.get('from'), url.searchParams.get('to'))

  const cacheKey = `${member.workspace_id}:${range.from}:${range.to}`
  const cached = getCachedContext(cacheKey)
  if (cached) return NextResponse.json(cached)

  const context = await buildAIContext(supabase, member.workspace_id, range)
  setCachedContext(cacheKey, context)

  return NextResponse.json(context)
}
