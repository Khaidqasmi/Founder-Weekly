import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { syncShopifyData, syncMetaAdsData } from '@/lib/integrations/sync-engine'

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

  const { provider } = await request.json()
  if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 })

  const { data: connection } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .eq('provider', provider)
    .eq('status', 'connected')
    .single()

  if (!connection) {
    return NextResponse.json({ error: `${provider} is not connected. Save your API keys first.` }, { status: 400 })
  }

  const ctx = {
    supabase,
    workspaceId: member.workspace_id,
    provider,
    accessToken: connection.access_token_encrypted || '',
    refreshToken: connection.refresh_token_encrypted || '',
    shopDomain: connection.shop_domain || '',
    adAccountId: connection.ad_account_id || '',
    ga4PropertyId: connection.ga4_property_id || '',
  }

  try {
    let result

    switch (provider) {
      case 'shopify':
        result = await syncShopifyData(ctx)
        break
      case 'meta':
        result = await syncMetaAdsData(ctx)
        break
      default:
        return NextResponse.json({ error: `Sync not implemented for ${provider}` }, { status: 400 })
    }

    await supabase
      .from('integration_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id)

    return NextResponse.json({ success: true, result })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
