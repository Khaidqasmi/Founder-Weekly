import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { syncShopifyData, syncMetaAdsData } from '@/lib/integrations/sync-engine'
import { decryptToken } from '@/lib/crypto'

const SYNC_PROVIDERS = new Set(['shopify', 'meta'])

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError && authError.message !== 'Auth session missing!') throw authError
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { provider } = await request.json()
    if (!provider || !SYNC_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Missing or unsupported provider' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    const { data: member, error: memberError } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) throw memberError
    if (!member) return NextResponse.json({ error: 'No workspace found for this user' }, { status: 404 })

    const { data: connection, error: connectionError } = await admin
      .from('integration_connections')
      .select('*')
      .eq('workspace_id', member.workspace_id)
      .eq('provider', provider)
      .eq('status', 'connected')
      .maybeSingle()

    if (connectionError) throw connectionError

    if (!connection) {
      return NextResponse.json({ error: `${provider} is not connected. Save your API keys first.` }, { status: 400 })
    }

    const ctx = {
      supabase: admin,
      workspaceId: member.workspace_id,
      provider,
      accessToken: decryptToken(connection.access_token_encrypted || ''),
      refreshToken: decryptToken(connection.refresh_token_encrypted || ''),
      shopDomain: connection.shop_domain || '',
      adAccountId: connection.ad_account_id || '',
      ga4PropertyId: connection.ga4_property_id || '',
    }

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

    const { error: updateError } = await admin
      .from('integration_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, result })

  } catch (err: any) {
    console.error('[integrations/sync] Sync failed', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
