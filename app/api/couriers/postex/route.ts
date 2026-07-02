import { NextRequest, NextResponse } from 'next/server'

const POSTEX_ENDPOINTS = {
  shipments: 'https://api.postex.pk/services/integration/api/order/v3/all-orders',
  remittances: 'https://api.postex.pk/services/integration/api/order/v3/remittance',
}

function postexError(body: any, fallback: string) {
  return (
    body?.statusMessage ||
    body?.message ||
    body?.error ||
    body?.errors ||
    fallback
  )
}

export async function POST(request: NextRequest) {
  try {
    const { token, resource } = await request.json()
    const cleanToken = String(token || '').trim()
    const type = resource === 'remittances' ? 'remittances' : 'shipments'

    if (!cleanToken) {
      return NextResponse.json({ error: 'PostEx API token is missing.' }, { status: 400 })
    }

    const res = await fetch(POSTEX_ENDPOINTS[type], {
      headers: {
        token: cleanToken,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    const text = await res.text()
    let data: any = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }

    const statusCode = Number(data?.statusCode || data?.status || res.status)
    if (!res.ok || (statusCode >= 400 && statusCode !== res.status)) {
      return NextResponse.json(
        { error: postexError(data, `PostEx API error: ${res.status}`), details: data },
        { status: res.ok ? 400 : res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'PostEx request failed.' }, { status: 500 })
  }
}
