import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const oauth = {
    shopify: !!(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET),
    meta: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
    google: !!(process.env.GA4_CLIENT_ID && process.env.GA4_CLIENT_SECRET),
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    // Return authenticated:false so the UI can distinguish "not logged in" from "logged in, no connections"
    if (!user) return NextResponse.json({ connections: [], authenticated: false, oauth })

    const { data: member } = await supabase
      .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ connections: [], authenticated: true, oauth })

    const { data: connections } = await supabase
      .from('integration_connections')
      .select('provider, status, shop_domain, ad_account_id, ga4_property_id, last_sync_at')
      .eq('workspace_id', member.workspace_id)

    return NextResponse.json({ connections: connections || [], authenticated: true, oauth })
  } catch {
    return NextResponse.json({ connections: [], authenticated: false, oauth })
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

    // Keep already-synced historical rows. Reconnecting a different store or
    // ad account clears only that provider's rows in the connection flow.
    return NextResponse.json({ success: true, retainedHistory: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
