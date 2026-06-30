import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const CLIENT_ID = process.env.GA4_CLIENT_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Google+app+not+configured`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login?next=/integrations`)

  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${APP_URL}/api/oauth/google/callback`

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account',
    state,
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  const res = NextResponse.redirect(authUrl)
  res.cookies.set('google_oauth_state', state, { httpOnly: true, maxAge: 300, path: '/' })
  return res
}
