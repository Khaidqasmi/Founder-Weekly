import { NextResponse } from 'next/server'

export async function POST() {
  if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Shopify integration not configured. Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.' },
      { status: 400 }
    )
  }
  return NextResponse.json({ error: 'Shopify sync not yet implemented. Credentials detected but sync logic requires store connection.' }, { status: 501 })
}
