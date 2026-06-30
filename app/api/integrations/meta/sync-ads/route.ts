import { NextResponse } from 'next/server'

export async function POST() {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return NextResponse.json(
      { error: 'Meta Ads integration not configured. Set META_APP_ID and META_APP_SECRET.' },
      { status: 400 }
    )
  }
  return NextResponse.json({ error: 'Meta Ads sync not yet implemented.' }, { status: 501 })
}
