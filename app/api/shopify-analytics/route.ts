import { NextRequest, NextResponse } from 'next/server'
import { fetchShopifyAnalytics } from '@/lib/integrations/shopify/analytics'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const domain = req.headers.get('x-shopify-domain') || searchParams.get('domain') || ''
  const token = req.headers.get('x-shopify-token') || searchParams.get('token') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0]

  if (!domain || !token) {
    return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
  }

  try {
    const data = await fetchShopifyAnalytics(domain, token, from, to)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
