import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchShopifyAnalytics } from '@/lib/integrations/shopify/analytics'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || new Date().toISOString().split('T')[0]

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

    const { data: connection } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('workspace_id', member.workspace_id)
      .eq('provider', 'shopify')
      .eq('status', 'connected')
      .single()

    if (!connection || !connection.shop_domain || !connection.access_token_encrypted) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
    }

    const analytics = await fetchShopifyAnalytics(
      connection.shop_domain,
      connection.access_token_encrypted,
      from,
      to
    )

    return NextResponse.json(analytics)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
