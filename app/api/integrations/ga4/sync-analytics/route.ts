import { NextResponse } from 'next/server'

export async function POST() {
  if (!process.env.GA4_CLIENT_ID || !process.env.GA4_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'GA4 integration not configured. Set GA4_CLIENT_ID and GA4_CLIENT_SECRET.' },
      { status: 400 }
    )
  }
  return NextResponse.json({ error: 'GA4 sync not yet implemented.' }, { status: 501 })
}
