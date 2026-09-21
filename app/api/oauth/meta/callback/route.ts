import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/crypto'
import { purgeProviderTemporaryData } from '@/lib/temporary-data'

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

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)
  if (req.cookies.get('meta_oauth_user')?.value !== user.id) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Your+session+changed.+Please+connect+again`)
  }

  const savedState = req.cookies.get('meta_oauth_state')?.value
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Invalid+OAuth+state.+Please+try+again`)
  }

  const redirectUri = `${APP_URL}/api/oauth/meta/callback`

  // Exchange code for long-lived token
  let accessToken: string, adAccounts: { id: string; name: string }[] = []
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    )
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`)
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)
    accessToken = tokenData.access_token

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${accessToken}`
    )
    const longLived = await longLivedRes.json()
    if (longLived.access_token) accessToken = longLived.access_token

    // Fetch all selectable ad accounts. Auto-connect only when there is one;
    // choosing the first account silently can attach the wrong client brand.
    const adRes = await fetch(
      `https://graph.facebook.com/v25.0/me/adaccounts?fields=id,name&limit=100&access_token=${accessToken}`
    )
    const adData = await adRes.json()
    if (!adRes.ok || adData?.error) throw new Error(adData?.error?.message || 'Could not load Meta ad accounts')
    adAccounts = (adData?.data || []).map((account: any) => ({ id: account.id, name: account.name || account.id }))
    if (adAccounts.length === 0) throw new Error('No Meta ad account is available for this Facebook user')
  } catch (err: any) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=${encodeURIComponent(err.message)}`)
  }


  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.redirect(`${APP_URL}/integrations?error=No+workspace`)

  const adAccountId = adAccounts.length === 1 ? adAccounts[0].id : ''
  const record = {
    workspace_id: member.workspace_id,
    provider: 'meta',
    status: adAccountId ? 'connected' : 'needs_selection',
    access_token_encrypted: encryptToken(accessToken),
    ad_account_id: adAccountId,
    last_sync_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('integration_connections').select('id, ad_account_id')
    .eq('workspace_id', member.workspace_id).eq('provider', 'meta').single()

  if (existing?.ad_account_id && existing.ad_account_id !== adAccountId) {
    await purgeProviderTemporaryData(createServiceRoleClient(), member.workspace_id, 'meta')
  }

  if (existing) {
    await supabase.from('integration_connections').update(record).eq('id', existing.id)
  } else {
    await supabase.from('integration_connections').insert(record)
  }

  const destination = adAccountId
    ? `${APP_URL}/integrations?connected=meta&autosync=meta`
    : `${APP_URL}/integrations?select=meta`
  const res = NextResponse.redirect(destination)
  res.cookies.delete('meta_oauth_state')
  res.cookies.delete('meta_oauth_user')
  return res
}
