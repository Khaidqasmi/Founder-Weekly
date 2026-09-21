import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

const SCOPES = process.env.SHOPIFY_SCOPES || [
  'read_orders',
  'read_products',
  'read_inventory',
  'read_analytics',
  'read_customers',
  'read_reports',
].join(',')

export async function GET(req: NextRequest) {
  if (!CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Shopify+app+not+configured`)
  }

  const shop = req.nextUrl.searchParams.get('shop')
  if (!shop) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Please+enter+your+store+domain+first`)
  }

  const normalizedShop = shop.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const shopDomain = normalizedShop.endsWith('.myshopify.com') ? normalizedShop : `${normalizedShop}.myshopify.com`
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=Enter+a+valid+myshopify.com+store+domain`)
  }
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = `/api/oauth/shopify?shop=${shopDomain}`
    return NextResponse.redirect(`${APP_URL}/login?next=${encodeURIComponent(next)}`)
  }
  const state = crypto.randomBytes(16).toString('hex')

  // Store state + userId in a short-lived cookie for CSRF check
  const redirectUri = `${APP_URL}/api/oauth/shopify/callback`
  const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('shopify_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 300, path: '/' })
  res.cookies.set('shopify_oauth_shop', shopDomain, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 300, path: '/' })
  res.cookies.set('shopify_oauth_user', user.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 300, path: '/' })
  return res
}
