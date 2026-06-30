import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const APP_ID = process.env.META_APP_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

const SCOPES = [
  'ads_read', 'ads_management', 'business_management',
  'read_insights', 'pages_read_engagement',
].join(',')

export async function GET(req: NextRequest) {
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

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params}`
  const res = NextResponse.redirect(authUrl)
  res.cookies.set('meta_oauth_state', state, { httpOnly: true, maxAge: 300, path: '/' })
  return res
}
