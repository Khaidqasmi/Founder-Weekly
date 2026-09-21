import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const APP_ID = process.env.META_APP_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// The dashboard only reads ad accounts, insights, and creatives. Requesting
// write/business scopes can trigger stricter Meta review/access blocks for
// merchants who only need reporting.
const SCOPES = ['ads_read'].join(',')

export async function GET() {
  if (!APP_ID) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Meta+app+not+configured`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login?next=/integrations`)

  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${APP_URL}/api/oauth/meta/callback`

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: 'code',
    state,
  })

  const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?${params}`
  const res = NextResponse.redirect(authUrl)
  res.cookies.set('meta_oauth_state', state, { httpOnly: true, maxAge: 300, path: '/' })
  return res
}
