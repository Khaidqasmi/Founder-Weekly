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

  // --- Detect common token paste mistakes before hitting Shopify ---
  if (accessToken.startsWith('shpuf_')) {
    return NextResponse.json(
      { error: 'That looks like a Storefront API token (shpuf_…). You need the Admin API access token — find it in your Shopify custom app under "API credentials" > "Admin API access token".' },
      { status: 400 }
    )
  }
  // API keys (client IDs) and API secrets are 32-char hex strings with no prefix
  if (/^[a-f0-9]{32}$/i.test(accessToken)) {
    return NextResponse.json(
      { error: 'That looks like an API key or client secret, not an access token. The Admin API access token starts with "shpat_" — find it in your Shopify custom app under "API credentials".' },
      { status: 400 }
    )
  }
  if (!accessToken.startsWith('shpat_')) {
    return NextResponse.json(
      { error: 'Admin API access tokens must start with "shpat_". Check that you copied the correct value from your Shopify custom app (Settings → Apps → your app → API credentials).' },
      { status: 400 }
    )
  }

  // --- Normalize the domain (strip protocol/path if accidentally included) ---
  const rawDomain = shopDomain.replace(/^https?:\/\//i, '').split('/')[0]
  const domain = rawDomain.includes('.myshopify.com')
    ? rawDomain
    : `${rawDomain}.myshopify.com`

  if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(domain)) {
    return NextResponse.json(
      { error: 'Enter the store domain as "yourstore.myshopify.com". Custom domains are not supported — use the original .myshopify.com address.' },
      { status: 400 }
    )
  }

  // Validate the token by calling a lightweight Shopify endpoint
  let shopName: string | undefined
  try {
    const testRes = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    })

    if (!testRes.ok) {
      const text = await testRes.text()
      // HTML response means the domain doesn't route to a Shopify store
      if (text.trimStart().startsWith('<')) {
        return NextResponse.json(
          { error: `Store "${domain}" was not found. Double-check the .myshopify.com domain and try again.` },
          { status: 400 }
        )
      }

      let parsed: any = {}
      try { parsed = JSON.parse(text) } catch {}

      if (testRes.status === 401) {
        return NextResponse.json(
          { error: `Access denied (401): the token was rejected by "${domain}". Verify you copied the Admin API access token from the correct store\'s custom app, and that the app has been installed on that store.` },
          { status: 400 }
        )
      }

      if (testRes.status === 403) {
        const detail = parsed.errors ? ` Details: ${parsed.errors}` : ''
        return NextResponse.json(
          { error: `Token accepted but missing permissions (403). Enable at least the "read_orders" and "read_products" scopes in the Shopify custom app settings, then reinstall the app.${detail}` },
          { status: 400 }
        )
      }

      if (testRes.status === 404) {
        return NextResponse.json(
          { error: `Store "${domain}" not found. Check the domain and try again.` },
          { status: 400 }
        )
      }

      const detail = parsed.errors || testRes.status.toString()
      return NextResponse.json(
        { error: `Shopify returned an unexpected error (${testRes.status}): ${detail}` },
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
