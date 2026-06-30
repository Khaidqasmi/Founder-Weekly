import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const { data: connections } = await supabase
    .from('integration_connections')
    .select('provider, status, shop_domain, ad_account_id, ga4_property_id, last_sync_at')
    .eq('workspace_id', member.workspace_id)

  return NextResponse.json({ connections: connections || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const body = await request.json()
  const { provider, credentials } = body

  if (!provider || !credentials) {
    return NextResponse.json({ error: 'Missing provider or credentials' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('integration_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('provider', provider)
    .single()

  const record: Record<string, any> = {
    workspace_id: member.workspace_id,
    provider,
    status: 'connected',
    access_token_encrypted: credentials.access_token || credentials.api_key || '',
    refresh_token_encrypted: credentials.api_secret || credentials.api_password || '',
    shop_domain: credentials.shop_domain || '',
    ad_account_id: credentials.ad_account_id || '',
    ga4_property_id: credentials.property_id || '',
  }

  if (existing) {
    await supabase
      .from('integration_connections')
      .update(record)
      .eq('id', existing.id)
  } else {
    await supabase
      .from('integration_connections')
      .insert(record)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const { provider } = await request.json()

  await supabase
    .from('integration_connections')
    .update({ status: 'disconnected', access_token_encrypted: '', refresh_token_encrypted: '' })
    .eq('workspace_id', member.workspace_id)
    .eq('provider', provider)

  return NextResponse.json({ success: true })
}
