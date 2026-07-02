import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchShopifyAnalytics } from '@/lib/integrations/shopify/analytics'

export async function GET(req: NextRequest) {
  // Require a signed-in user — this route must not act as an open proxy
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  // Token is only accepted via header — never in the URL, where it would be logged
  const domain = (req.headers.get('x-shopify-domain') || '').toLowerCase()
  const token = req.headers.get('x-shopify-token') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0]

  if (!domain || !token) {
    return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
  }

  // Only forward requests to real Shopify store domains
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid Shopify domain' }, { status: 400 })
  }

  try {
    const data = await fetchShopifyAnalytics(domain, token, from, to)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
