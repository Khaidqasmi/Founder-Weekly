import { NextRequest, NextResponse } from 'next/server'

const POSTEX_ENDPOINTS = {
  shipments: 'https://api.postex.pk/services/integration/api/order/v3/all-orders',
  remittances: 'https://api.postex.pk/services/integration/api/order/v3/remittance',
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function orderRanges() {
  const to = new Date()
  return [30, 365, 1095].map((days) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    return { fromDate: dateKey(from), toDate: dateKey(to) }
  })
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

function shipmentAttempts(token: string) {
  const statuses = [0, 2, 3, 4, 5, 6, 15, 16, 17, 18]
  const attempts: Array<() => Promise<{ res: Response; data: any }>> = []

  for (const range of orderRanges()) {
    const allParams = new URLSearchParams({ orderStatusID: '0', ...range })
    attempts.push(() => fetchPostEx(`${POSTEX_ENDPOINTS.shipments}?${allParams.toString()}`, token))
    attempts.push(() => fetchPostEx(POSTEX_ENDPOINTS.shipments, token, {
      method: 'POST',
      body: JSON.stringify({ orderStatusID: 0, ...range }),
    }))

    for (const status of statuses.slice(1)) {
      const params = new URLSearchParams({ orderStatusID: String(status), ...range })
      attempts.push(() => fetchPostEx(`${POSTEX_ENDPOINTS.shipments}?${params.toString()}`, token))
    }
  }

  attempts.push(() => fetchPostEx(POSTEX_ENDPOINTS.shipments, token))
  return attempts
}

export async function POST(request: NextRequest) {
  try {
    const { token, resource } = await request.json()
    const cleanToken = String(token || '').trim()
    const type = resource === 'remittances' ? 'remittances' : 'shipments'

    if (!cleanToken) {
      return NextResponse.json({ error: 'PostEx API token is missing.' }, { status: 400 })
    }

    const attempts = type === 'shipments'
      ? shipmentAttempts(cleanToken)
      : [
          () => fetchPostEx(POSTEX_ENDPOINTS.remittances, cleanToken),
        ]

    let lastResult: { res: Response; data: any } | null = null
    for (const attempt of attempts) {
      const result = await attempt()
      lastResult = result
      const rows = extractRows(result.data)
      if (result.res.ok && rows.length > 0) return NextResponse.json(result.data)
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
