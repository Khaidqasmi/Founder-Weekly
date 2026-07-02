import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/crypto'

/**
 * POST /api/integrations/shopify/connect
 *
 * Supports two connection modes:
 *
 * 1. Direct Admin API token (custom app or Dev Dashboard generated token):
 *    Body: { shopDomain: string, accessToken: string }
 *    Validates the token directly against /admin/api/2024-01/shop.json.
 *
 * 2. Dev Dashboard app credentials:
 *    Body: { shopDomain: string, clientId: string, clientSecret: string }
 *    Exchanges credentials via POST /admin/oauth/access_token with
 *    grant_type=client_credentials, then validates the returned token.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      {
        error:
          'You are not signed in to Founder Weekly. Please sign in at /login before connecting integrations. ' +
          'If you are accessing this from the Shopify admin embedded app, open Founder Weekly in a new browser tab, sign in or create an account, and then return here to connect your store.',
      },
      { status: 401 }
    )
  }

  let shopDomain: string,
    accessToken: string | undefined,
    clientId: string | undefined,
    clientSecret: string | undefined
  try {
    const body = await req.json()
    shopDomain = body.shopDomain?.trim()
    accessToken = body.accessToken?.trim() || undefined
    clientId = body.clientId?.trim() || undefined
    clientSecret = body.clientSecret?.trim() || undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!shopDomain) {
    return NextResponse.json({ error: 'shopDomain is required' }, { status: 400 })
  }

  const useClientCredentials = !!(clientId && clientSecret)
  if (!useClientCredentials && !accessToken) {
    return NextResponse.json(
      { error: 'Provide either an access token, or both a Client ID and Client Secret.' },
      { status: 400 }
    )
  }

  // Detect Storefront API tokens — always wrong for Admin API
  if (accessToken?.startsWith('shpuf_')) {
    return NextResponse.json(
      { error: 'That looks like a Storefront API token (shpuf_…). You need the Admin API access token — find it in Shopify admin under Settings → Apps and sales channels → Develop apps → (your app) → API credentials.' },
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

  // --- For Dev Dashboard mode: exchange client credentials for an access token ---
  let resolvedToken: string
  if (useClientCredentials) {
    try {
      const tokenRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId!,
          client_secret: clientSecret!,
        }),
      })

      const tokenText = await tokenRes.text()
      if (!tokenRes.ok) {
        if (tokenText.trimStart().startsWith('<')) {
          // HTML response — only a 404 means the domain itself is wrong.
          // Any other status (401, 400, etc.) means the domain is reachable but the
          // app credentials are invalid, the app isn't installed on this store, or
          // there is a distribution/profile mismatch in the Dev Dashboard.
          if (tokenRes.status === 404) {
            return NextResponse.json(
              { error: `Store "${domain}" was not found. Double-check the .myshopify.com domain.` },
              { status: 400 }
            )
          }
          return NextResponse.json(
            {
              error: `Credential exchange failed (${tokenRes.status}). The store domain "${domain}" appears to be valid, but Shopify rejected the request. This usually means one of the following:\n• The app is not installed on this store\n• The Client ID or Client Secret doesn't match this store's app\n• The app's distribution mode in the Dev Dashboard doesn't support client_credentials\n\nVerify your Client ID and Client Secret in the Shopify Dev Dashboard and make sure the app is installed on "${domain}".`,
            },
            { status: 400 }
          )
        }
        let parsed: any = {}
        try { parsed = JSON.parse(tokenText) } catch {}
        const detail = parsed.error_description || parsed.error || tokenRes.status.toString()
        return NextResponse.json(
          { error: `Failed to exchange credentials (${tokenRes.status}): ${detail}. Verify your Client ID and Client Secret in the Shopify Dev Dashboard.` },
          { status: 400 }
        )
      }

      let tokenData: any = {}
      try { tokenData = JSON.parse(tokenText) } catch {}
      if (!tokenData.access_token) {
        return NextResponse.json(
          { error: 'Shopify did not return an access token. Check that your app supports the client_credentials grant (Dev Dashboard apps).' },
          { status: 400 }
        )
      }
      resolvedToken = tokenData.access_token
    } catch (err: any) {
      return NextResponse.json(
        { error: `Could not reach Shopify to exchange credentials: ${err.message}` },
        { status: 502 }
      )
    }
  } else {
    resolvedToken = accessToken!
  }

  // --- Validate the resolved token ---
  let shopName: string | undefined
  try {
    const testRes = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': resolvedToken },
    })

    if (!testRes.ok) {
      const text = await testRes.text()
      if (text.trimStart().startsWith('<')) {
        // HTML body — only a 404 means the domain is wrong.
        // Other statuses mean the domain is reachable but the token/credentials are rejected.
        if (testRes.status === 404) {
          return NextResponse.json(
            { error: `Store "${domain}" was not found. Double-check the .myshopify.com domain and try again.` },
            { status: 400 }
          )
        }
        return NextResponse.json(
          {
            error: `Token validation failed (${testRes.status}). The store "${domain}" is reachable but Shopify rejected the token. This indicates a credentials or configuration problem — not an invalid domain. Check that your access token (or Client ID/Secret) is correct and that the app is properly installed on this store.`,
          },
          { status: 400 }
        )
      }

      let parsed: any = {}
      try { parsed = JSON.parse(text) } catch {}

      if (testRes.status === 401) {
        const hint = useClientCredentials
          ? 'Verify your Client ID and Client Secret are correct and the app is installed on this store.'
          : 'If you have a Dev Dashboard app, switch to "Dev Dashboard app" mode and enter your Client ID + Client Secret instead. For a Custom app, copy the Admin API access token from Settings → Apps → Develop apps → (your app) → API credentials.'
        return NextResponse.json(
          { error: `Access denied (401): the token was rejected by "${domain}". ${hint}` },
          { status: 400 }
        )
      }

      if (testRes.status === 403) {
        const detail = parsed.errors ? ` Details: ${parsed.errors}` : ''
        return NextResponse.json(
          { error: `Token accepted but missing permissions (403). In Shopify admin, go to Settings → Apps and sales channels → Develop apps → (your app) → Configuration and enable at least the "read_orders" and "read_products" Admin API scopes, then reinstall the app.${detail}` },
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

  // Upsert the integration_connections record — always save the resolved access token
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
    access_token_encrypted: encryptToken(resolvedToken),
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
