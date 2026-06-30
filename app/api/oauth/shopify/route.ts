import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

const SCOPES = [
  'read_orders', 'read_products', 'read_inventory',
  'read_analytics', 'read_customers', 'read_reports',
].join(',')

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Shopify+app+not+configured`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login?next=/integrations`)

  const shop = req.nextUrl.searchParams.get('shop')
  if (!shop) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Please+enter+your+store+domain+first`)
  }

  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
  const state = crypto.randomBytes(16).toString('hex')

  // Store state + userId in a short-lived cookie for CSRF check
  const redirectUri = `${APP_URL}/api/oauth/shopify/callback`
  const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('shopify_oauth_state', state, { httpOnly: true, maxAge: 300, path: '/' })
  res.cookies.set('shopify_oauth_shop', shopDomain, { httpOnly: true, maxAge: 300, path: '/' })
  return res
}
