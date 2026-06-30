import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`)
    const tokenData = await tokenRes.json()
    accessToken = tokenData.access_token
    if (!accessToken) throw new Error('No access token returned')
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
    .from('integration_connections').select('id')
    .eq('workspace_id', member.workspace_id).eq('provider', 'shopify').single()

  const record = {
    workspace_id: member.workspace_id,
    provider: 'shopify',
    status: 'connected',
    shop_domain: shop,
    access_token_encrypted: accessToken,
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
