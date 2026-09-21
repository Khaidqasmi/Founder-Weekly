import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { decryptToken, encryptToken } from '@/lib/crypto'

type Provider = 'meta' | 'google'
type Option = { id: string; name: string }

async function getContext(provider: Provider) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: NextResponse.json({ error: 'No workspace found' }, { status: 404 }) }

  const { data: connection } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .eq('provider', provider)
    .single()
  if (!connection) return { error: NextResponse.json({ error: `${provider} is not authorized` }, { status: 404 }) }

  return { supabase, connection }
}

async function refreshGoogleToken(refreshToken: string) {
  if (!refreshToken || !process.env.GA4_CLIENT_ID || !process.env.GA4_CLIENT_SECRET) return ''
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GA4_CLIENT_ID,
      client_secret: process.env.GA4_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await response.json().catch(() => ({}))
  return response.ok ? body.access_token || '' : ''
}

async function fetchOptions(provider: Provider, connection: any): Promise<{ options: Option[]; accessToken?: string }> {
  let accessToken = decryptToken(connection.access_token_encrypted || '')

  if (provider === 'meta') {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/me/adaccounts?fields=id,name&limit=100&access_token=${encodeURIComponent(accessToken)}`
    )
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body.error) throw new Error(body.error?.message || 'Could not load Meta ad accounts')
    return {
      options: (body.data || []).map((account: any) => ({ id: account.id, name: account.name || account.id })),
    }
  }

  let response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 401) {
    accessToken = await refreshGoogleToken(decryptToken(connection.refresh_token_encrypted || ''))
    if (accessToken) {
      response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    }
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.error) throw new Error(body.error?.message || 'Could not load GA4 properties')
  const options = (body.accountSummaries || []).flatMap((account: any) =>
    (account.propertySummaries || []).map((property: any) => ({
      id: String(property.property || '').replace(/^properties\//, ''),
      name: `${property.displayName || property.property}${account.displayName ? ` — ${account.displayName}` : ''}`,
    }))
  ).filter((property: Option) => property.id)
  return { options, accessToken }
}

function readProvider(value: string | null): Provider | null {
  return value === 'meta' || value === 'google' ? value : null
}

export async function GET(request: NextRequest) {
  try {
    const provider = readProvider(request.nextUrl.searchParams.get('provider'))
    if (!provider) return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    const context = await getContext(provider)
    if ('error' in context) return context.error

    const result = await fetchOptions(provider, context.connection)
    if (result.accessToken) {
      await context.supabase
        .from('integration_connections')
        .update({ access_token_encrypted: encryptToken(result.accessToken) })
        .eq('id', context.connection.id)
    }
    return NextResponse.json({ provider, options: result.options })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Could not load accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const provider = readProvider(body.provider)
    const selectedId = String(body.selectedId || '').trim()
    if (!provider || !selectedId) return NextResponse.json({ error: 'Provider and selection are required' }, { status: 400 })

    const context = await getContext(provider)
    if ('error' in context) return context.error
    const result = await fetchOptions(provider, context.connection)
    if (!result.options.some((option) => option.id === selectedId)) {
      return NextResponse.json({ error: 'That account is not available to the authorized user' }, { status: 403 })
    }

    const update: Record<string, string> = { status: 'connected' }
    if (provider === 'meta') update.ad_account_id = selectedId
    else update.ga4_property_id = selectedId
    if (result.accessToken) update.access_token_encrypted = encryptToken(result.accessToken)

    const { error } = await context.supabase
      .from('integration_connections')
      .update(update)
      .eq('id', context.connection.id)
    if (error) throw error

    return NextResponse.json({ success: true, provider, selectedId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Could not save selection' }, { status: 500 })
  }
}
