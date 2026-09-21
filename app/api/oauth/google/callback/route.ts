import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/crypto'

const CLIENT_ID = process.env.GA4_CLIENT_ID!
const CLIENT_SECRET = process.env.GA4_CLIENT_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Google+authorization+was+cancelled`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)
  if (req.cookies.get('google_oauth_user')?.value !== user.id) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Your+session+changed.+Please+connect+again`)
  }

  const savedState = req.cookies.get('google_oauth_state')?.value
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Invalid+OAuth+state.+Please+try+again`)
  }

  const redirectUri = `${APP_URL}/api/oauth/google/callback`

  // Exchange code for tokens
  let accessToken: string, refreshToken: string, email: string
  let properties: { id: string; name: string }[] = []
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`)
    const tokens = await tokenRes.json()
    accessToken = tokens.access_token
    refreshToken = tokens.refresh_token || ''
    if (!accessToken) throw new Error('No access token returned')

    // Get user info + GA4 properties
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userInfo = await userRes.json()
    email = userInfo.email || ''

    const propertyRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const propertyData = await propertyRes.json()
    if (!propertyRes.ok || propertyData?.error) {
      throw new Error(propertyData?.error?.message || 'Could not load Google Analytics properties')
    }
    properties = (propertyData.accountSummaries || []).flatMap((account: any) =>
      (account.propertySummaries || []).map((property: any) => ({
        id: String(property.property || '').replace(/^properties\//, ''),
        name: property.displayName || property.property,
      }))
    ).filter((property: { id: string }) => property.id)
    if (properties.length === 0) throw new Error('No GA4 property is available for this Google account')
  } catch (err: any) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=${encodeURIComponent(err.message)}`)
  }

  // Save to database

  const { data: member } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.redirect(`${APP_URL}/integrations?error=No+workspace`)

  const propertyId = properties.length === 1 ? properties[0].id : ''
  const record = {
    workspace_id: member.workspace_id,
    provider: 'google',
    status: propertyId ? 'connected' : 'needs_selection',
    access_token_encrypted: encryptToken(accessToken),
    refresh_token_encrypted: encryptToken(refreshToken),
    shop_domain: email,
    ga4_property_id: propertyId,
    last_sync_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('integration_connections').select('id')
    .eq('workspace_id', member.workspace_id).eq('provider', 'google').single()

  if (existing) {
    await supabase.from('integration_connections').update(record).eq('id', existing.id)
  } else {
    await supabase.from('integration_connections').insert(record)
  }

  const res = NextResponse.redirect(
    propertyId
      ? `${APP_URL}/integrations?connected=google`
      : `${APP_URL}/integrations?select=google`
  )
  res.cookies.delete('google_oauth_state')
  res.cookies.delete('google_oauth_user')
  return res
}
