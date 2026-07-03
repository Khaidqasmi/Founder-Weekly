import { NextRequest, NextResponse } from 'next/server'

const POSTEX_ENDPOINTS = {
  orders: 'https://api.postex.pk/services/integration/api/order/v1/get-all-order',
  paymentStatus: 'https://api.postex.pk/services/integration/api/order/v1/payment-status',
}

function isoDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function orderRanges() {
  const to = new Date()
  return [30, 90, 365, 1095].map((days) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    return { fromDate: isoDateKey(from), toDate: isoDateKey(to) }
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

function normalizeOrderRows(rows: any[]) {
  return rows.map((row) => ({
    ...(row?.trackingResponse || row || {}),
    trackingNumber: row?.trackingResponse?.trackingNumber || row?.trackingNumber || row?.tracking_number || '',
    message: row?.message || row?.trackingResponse?.message || '',
  }))
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

function orderAttempts(token: string) {
  const attempts: Array<() => Promise<{ res: Response; data: any }>> = []

  // PDF v4.1.9: List Orders API is GET /order/v1/get-all-order
  // with token header and orderStatusID/fromDate/toDate parameters.
  for (const range of orderRanges()) {
    const params = new URLSearchParams({ orderStatusID: '0', ...range })
    attempts.push(() => fetchPostEx(`${POSTEX_ENDPOINTS.orders}?${params.toString()}`, token))
    attempts.push(() => fetchPostEx(POSTEX_ENDPOINTS.orders, token, {
      method: 'POST',
      body: JSON.stringify({ orderStatusID: 0, ...range }),
    }))
  }

  return attempts
}

async function fetchPaymentRows(token: string, rows: any[]) {
  const trackingNumbers = rows
    .map((row) => String(row.trackingNumber || row.tracking_number || '').trim())
    .filter(Boolean)
    .slice(0, 50)

  const payments = await Promise.all(
    trackingNumbers.map(async (trackingNumber) => {
      try {
        const { res, data } = await fetchPostEx(`${POSTEX_ENDPOINTS.paymentStatus}/${encodeURIComponent(trackingNumber)}`, token)
        if (!res.ok) return null
        const payment = data?.dist || data?.data || data
        return {
          ...payment,
          trackingNumber: payment?.trackingNumber || trackingNumber,
        }
      } catch {
        return null
      }
    })
  )

  return payments.filter(Boolean)
}

export async function POST(request: NextRequest) {
  try {
    const { token, resource } = await request.json()
    const cleanToken = String(token || '').trim()
    const type = resource === 'remittances' ? 'remittances' : 'shipments'

    if (!cleanToken) {
      return NextResponse.json({ error: 'PostEx API token is missing.' }, { status: 400 })
    }

    const attempts = orderAttempts(cleanToken)

    let lastResult: { res: Response; data: any } | null = null
    for (const attempt of attempts) {
      const result = await attempt()
      lastResult = result
      const rows = normalizeOrderRows(extractRows(result.data))
      if (result.res.ok && rows.length > 0) {
        if (type === 'remittances') {
          const payments = await fetchPaymentRows(cleanToken, rows)
          return NextResponse.json({ ...result.data, dist: payments })
        }
        return NextResponse.json({ ...result.data, dist: rows })
      }
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
      dist: normalizeOrderRows(extractRows(data)),
      warning: postexError(data, 'No PostEx shipments were returned for the last 1 year.'),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'PostEx request failed.' }, { status: 500 })
  }
}
