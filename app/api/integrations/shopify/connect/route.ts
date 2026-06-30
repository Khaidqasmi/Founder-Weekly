import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/integrations/shopify/connect
 *
 * Saves a Shopify Admin API access token directly (no OAuth required).
 * The token is validated against /admin/api/2024-01/shop.json before saving.
 *
 * Body: { shopDomain: string, accessToken: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let shopDomain: string, accessToken: string
  try {
    const body = await req.json()
    shopDomain = body.shopDomain?.trim()
    accessToken = body.accessToken?.trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!shopDomain || !accessToken) {
    return NextResponse.json({ error: 'shopDomain and accessToken are required' }, { status: 400 })
  }

  const domain = shopDomain.includes('.myshopify.com')
    ? shopDomain
    : `${shopDomain}.myshopify.com`

  // Validate the token by calling a lightweight Shopify endpoint
  let shopName: string | undefined
  try {
    const testRes = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    })

    if (!testRes.ok) {
      const text = await testRes.text()
      // Check if Shopify returned HTML (common for invalid domains)
      if (text.trimStart().startsWith('<')) {
        return NextResponse.json(
          { error: `Store "${domain}" not found or access denied. Check the domain and try again.` },
          { status: 400 }
        )
      }
      let detail = testRes.status.toString()
      try { detail = JSON.parse(text).errors || detail } catch {}
      return NextResponse.json(
        { error: `Shopify rejected the token (${detail}). Make sure the token has read permissions.` },
        { status: 400 }
      )
    }

    const shopData = await testRes.json()
    shopName = shopData.shop?.name
  } catch (err: any) {
    return NextResponse.json(
      { error: `Could not reach Shopify: ${err.message}` },
      { status: 502 }
    )
  }

  // Look up the user's workspace
  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'No workspace found for this account' }, { status: 404 })
  }

  // Upsert the integration_connections record
  const { data: existing } = await supabase
    .from('integration_connections')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .eq('provider', 'shopify')
    .single()

  const record = {
    workspace_id: member.workspace_id,
    provider: 'shopify',
    status: 'connected',
    shop_domain: domain,
    access_token_encrypted: accessToken,
    last_sync_at: new Date().toISOString(),
  }

  const { error: dbError } = existing
    ? await supabase.from('integration_connections').update(record).eq('id', existing.id)
    : await supabase.from('integration_connections').insert(record)

  if (dbError) {
    return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, shopDomain: domain, shopName })
}
