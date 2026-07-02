import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/crypto'

const APP_ID = process.env.META_APP_ID!
const APP_SECRET = process.env.META_APP_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Meta+authorization+was+cancelled`)
  }

  const savedState = req.cookies.get('meta_oauth_state')?.value
  if (state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Invalid+OAuth+state.+Please+try+again`)
  }

  const redirectUri = `${APP_URL}/api/oauth/meta/callback`

  // Exchange code for long-lived token
  let accessToken: string, adAccountId = ''
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    )
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`)
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)
    accessToken = tokenData.access_token

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${accessToken}`
    )
    const longLived = await longLivedRes.json()
    if (longLived.access_token) accessToken = longLived.access_token

    // Fetch first ad account
    const adRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&limit=1&access_token=${accessToken}`
    )
    const adData = await adRes.json()
    adAccountId = adData?.data?.[0]?.id || ''
  } catch (err: any) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=${encodeURIComponent(err.message)}`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.redirect(`${APP_URL}/integrations?error=No+workspace`)

  const record = {
    workspace_id: member.workspace_id,
    provider: 'meta',
    status: 'connected',
    access_token_encrypted: encryptToken(accessToken),
    ad_account_id: adAccountId,
    last_sync_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('integration_connections').select('id')
    .eq('workspace_id', member.workspace_id).eq('provider', 'meta').single()

  if (existing) {
    await supabase.from('integration_connections').update(record).eq('id', existing.id)
  } else {
    await supabase.from('integration_connections').insert(record)
  }

  const res = NextResponse.redirect(`${APP_URL}/integrations?connected=meta`)
  res.cookies.delete('meta_oauth_state')
  return res
}
