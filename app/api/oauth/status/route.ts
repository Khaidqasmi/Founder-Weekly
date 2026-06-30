import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ connections: [] })

    const { data: member } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ connections: [] })

    const { data: connections } = await supabase
      .from('integration_connections')
      .select('provider, status, shop_domain, ad_account_id, ga4_property_id, last_sync_at')
      .eq('workspace_id', member.workspace_id)

    return NextResponse.json({ connections: connections || [] })
  } catch {
    return NextResponse.json({ connections: [] })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

    const { provider } = await req.json()
    await supabase
      .from('integration_connections')
      .update({ status: 'disconnected', access_token_encrypted: '', refresh_token_encrypted: '' })
      .eq('workspace_id', member.workspace_id)
      .eq('provider', provider)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
