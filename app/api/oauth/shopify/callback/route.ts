import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/crypto'
import { purgeProviderTemporaryData } from '@/lib/temporary-data'

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop')

  const savedState = req.cookies.get('shopify_oauth_state')?.value
  const savedShop = req.cookies.get('shopify_oauth_shop')?.value

  if (!code || !state || !shop) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Shopify+authorization+was+cancelled`)
  }
  if (state !== savedState || shop !== savedShop) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Invalid+OAuth+state.+Please+try+again`)
  }

  // Exchange code for access token
  let accessToken: string
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    })

    const rawText = await tokenRes.text()

    if (!tokenRes.ok) {
      // Shopify sometimes returns an HTML page for bad requests instead of JSON
      if (rawText.trimStart().startsWith('<')) {
        throw new Error(`Shopify token exchange failed (${tokenRes.status}). Check that your Shopify app credentials are correct.`)
      }
      let detail: string
      try { detail = JSON.parse(rawText).error_description || JSON.parse(rawText).error || tokenRes.status.toString() } catch { detail = tokenRes.status.toString() }
      throw new Error(`Shopify token exchange failed: ${detail}`)
    }

    let tokenData: any
    try {
      tokenData = JSON.parse(rawText)
    } catch {
      throw new Error('Shopify returned an unexpected response during token exchange.')
    }

    accessToken = tokenData.access_token
    if (!accessToken) throw new Error('Shopify did not return an access token. The app may lack the required scopes.')
  } catch (err: any) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=${encodeURIComponent(err.message)}`)
  }

  // Save to database
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.redirect(`${APP_URL}/integrations?error=No+workspace+found`)

  const { data: existing } = await supabase
    .from('integration_connections').select('id, shop_domain')
    .eq('workspace_id', member.workspace_id).eq('provider', 'shopify').single()

  if (existing?.shop_domain && existing.shop_domain !== shop) {
    await purgeProviderTemporaryData(createServiceRoleClient(), member.workspace_id, 'shopify')
  }

  const record = {
    workspace_id: member.workspace_id,
    provider: 'shopify',
    status: 'connected',
    shop_domain: shop,
    access_token_encrypted: encryptToken(accessToken),
    last_sync_at: new Date().toISOString(),
  }

  if (existing) {
    await supabase.from('integration_connections').update(record).eq('id', existing.id)
  } else {
    await supabase.from('integration_connections').insert(record)
  }

  const res = NextResponse.redirect(`${APP_URL}/integrations?connected=shopify`)
  res.cookies.delete('shopify_oauth_state')
  res.cookies.delete('shopify_oauth_shop')
  return res
}
