import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getOrCreateWorkspace(supabase: any, user: any) {
  const { data: existingMember, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember) return existingMember
  if (memberError) throw memberError

  const email = user.email || ''
  const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'Founder'

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      email,
      role: 'user',
    }, { onConflict: 'id' })

  if (profileError) throw profileError

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      owner_id: user.id,
      business_name: `${fullName}'s Workspace`,
      report_email: email,
    })
    .select('id')
    .single()

  if (workspaceError) throw workspaceError

  const { data: member, error: createMemberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })
    .select('workspace_id')
    .single()

  if (createMemberError) throw createMemberError
  return member
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await getOrCreateWorkspace(supabase, user)

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

  const member = await getOrCreateWorkspace(supabase, user)

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
    .maybeSingle()

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
