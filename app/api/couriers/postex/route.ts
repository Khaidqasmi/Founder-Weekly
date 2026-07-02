import { NextRequest, NextResponse } from 'next/server'

const POSTEX_ENDPOINTS = {
  shipments: 'https://api.postex.pk/services/integration/api/order/v3/all-orders',
  remittances: 'https://api.postex.pk/services/integration/api/order/v3/remittance',
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function defaultOrderRange() {
  const to = new Date()
  const from = new Date()
  from.setFullYear(from.getFullYear() - 1)
  return { fromDate: dateKey(from), toDate: dateKey(to) }
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

function extractRows(data: any) {
  const candidates = [data?.dist, data?.data, data?.orders, data?.shipments, data]
  for (const value of candidates) {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      const nested = Object.values(value).find(Array.isArray)
      if (Array.isArray(nested)) return nested
    }
  }
  return []
}

async function parseResponse(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

async function fetchPostEx(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const data = await parseResponse(res)
  return { res, data }
}

export async function POST(request: NextRequest) {
  try {
    const { token, resource } = await request.json()
    const cleanToken = String(token || '').trim()
    const type = resource === 'remittances' ? 'remittances' : 'shipments'

    if (!cleanToken) {
      return NextResponse.json({ error: 'PostEx API token is missing.' }, { status: 400 })
    }

    const range = defaultOrderRange()
    const shipmentParams = new URLSearchParams({
      orderStatusID: '0',
      fromDate: range.fromDate,
      toDate: range.toDate,
    })

    const attempts = type === 'shipments'
      ? [
          () => fetchPostEx(`${POSTEX_ENDPOINTS.shipments}?${shipmentParams.toString()}`, cleanToken),
          () => fetchPostEx(POSTEX_ENDPOINTS.shipments, cleanToken, {
            method: 'POST',
            body: JSON.stringify({ orderStatusID: 0, ...range }),
          }),
          () => fetchPostEx(POSTEX_ENDPOINTS.shipments, cleanToken),
        ]
      : [
          () => fetchPostEx(POSTEX_ENDPOINTS.remittances, cleanToken),
        ]

    let lastResult: { res: Response; data: any } | null = null
    for (const attempt of attempts) {
      const result = await attempt()
      lastResult = result
      const rows = extractRows(result.data)
      const message = String(postexError(result.data, '') || '').toLowerCase()
      if (result.res.ok && rows.length > 0) return NextResponse.json(result.data)
      if (result.res.ok && type === 'shipments' && !message.includes('no message available')) return NextResponse.json(result.data)
    }

    const res = lastResult!.res
    const data = lastResult!.data
    const message = String(postexError(data, '') || '')

    if (message.toLowerCase().includes('no message available')) {
      return NextResponse.json({
        ...data,
        dist: [],
        warning: 'PostEx did not return shipments for the selected account/range.',
      })
    }

    const statusCode = Number(data?.statusCode || data?.status || res.status)
    if (!res.ok || (statusCode >= 400 && statusCode !== res.status)) {
      return NextResponse.json(
        { error: postexError(data, `PostEx API error: ${res.status}`), details: data },
        { status: res.ok ? 400 : res.status }
      )
    }

    return NextResponse.json({
      ...data,
      dist: extractRows(data),
      warning: postexError(data, 'No PostEx shipments were returned for the last 1 year.'),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'PostEx request failed.' }, { status: 500 })
  }
}
