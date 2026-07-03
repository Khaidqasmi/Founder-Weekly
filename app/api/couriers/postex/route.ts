import { NextRequest, NextResponse } from 'next/server'
import https from 'node:https'

// PostEx Merchant API integration (Guide v4.1.9)
// Server-side proxy so the merchant token never touches the browser and CORS is avoided.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POSTEX_ENDPOINTS = {
  // §3.16 List Orders API — GET, params sent as a JSON body per the guide.
  allOrders: 'https://api.postex.pk/services/integration/api/order/v1/get-all-order',
  // §3.6 List Un-booked Orders — GET with startDate/endDate.
  unbookedOrders: 'https://api.postex.pk/services/integration/api/order/v2/get-unbooked-orders',
  // §3.14 Payment Status API — GET /payment-status/{trackingNumber}.
  paymentStatus: 'https://api.postex.pk/services/integration/api/order/v1/payment-status',
  // Legacy endpoint kept as a last-resort fallback for older accounts.
  legacyOrders: 'https://api.postex.pk/services/integration/api/order/v3/all-orders',
}

function isoDateKey(date: Date) {
  // Guide requires yyyy-mm-dd for fromDate/toDate.
  return date.toISOString().split('T')[0]
}

// A single wide window keeps the number of upstream calls small while still
// covering practically every order. toDate is pushed to tomorrow so orders
// created "today" in PKT are never missed due to UTC offset.
function dateWindow() {
  const to = new Date()
  to.setDate(to.getDate() + 1)
  const from = new Date()
  from.setDate(from.getDate() - 1095) // ~3 years back
  return { fromDate: isoDateKey(from), toDate: isoDateKey(to) }
}

function postexError(body: any, fallback: string) {
  return body?.statusMessage || body?.message || body?.error || body?.errors || fallback
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

// get-all-order / track responses nest the real fields under `trackingResponse`.
function normalizeOrderRows(rows: any[]) {
  return rows.map((row) => ({
    ...(row?.trackingResponse || row || {}),
    trackingNumber:
      row?.trackingResponse?.trackingNumber || row?.trackingNumber || row?.tracking_number || '',
    message: row?.message || row?.trackingResponse?.message || '',
  }))
}

function safeJson(text: string) {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

type PostExResult = { status: number; ok: boolean; data: any }

// Standard fetch for GET-with-query and POST calls.
async function fetchPostEx(url: string, token: string, init?: RequestInit): Promise<PostExResult> {
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
  const data = safeJson(await res.text())
  return { status: res.status, ok: res.ok, data }
}

// The guide documents get-all-order as a GET whose parameters travel in a JSON
// body. Node's fetch (undici) forbids a body on GET, so use the raw https module.
function getWithBody(url: string, token: string, body: string): Promise<PostExResult> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          token,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = ''
        res.on('data', (chunk) => (text += chunk))
        res.on('end', () => {
          const status = res.statusCode || 0
          resolve({ status, ok: status >= 200 && status < 300, data: safeJson(text) })
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function tryAttempt(fn: () => Promise<PostExResult>): Promise<PostExResult | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

// Ordered, spec-first attempts. Stops at the first that returns rows.
function orderAttempts(token: string) {
  const { fromDate, toDate } = dateWindow()
  const allBody = JSON.stringify({ orderStatusID: 0, fromDate, toDate })
  const allQuery = new URLSearchParams({ orderStatusID: '0', fromDate, toDate }).toString()
  const unbookedQuery = new URLSearchParams({ startDate: fromDate, endDate: toDate }).toString()

  return [
    // 1. Spec-accurate: GET get-all-order with JSON body.
    () => getWithBody(POSTEX_ENDPOINTS.allOrders, token, allBody),
    // 2. GET get-all-order with query params.
    () => fetchPostEx(`${POSTEX_ENDPOINTS.allOrders}?${allQuery}`, token),
    // 3. POST get-all-order with JSON body.
    () => fetchPostEx(POSTEX_ENDPOINTS.allOrders, token, { method: 'POST', body: allBody }),
    // 4. Un-booked orders (GET) so freshly created orders still appear.
    () => fetchPostEx(`${POSTEX_ENDPOINTS.unbookedOrders}?${unbookedQuery}`, token),
    () =>
      getWithBody(POSTEX_ENDPOINTS.unbookedOrders, token, JSON.stringify({ startDate: fromDate, endDate: toDate })),
    // 5. Legacy endpoint fallback.
    () => fetchPostEx(`${POSTEX_ENDPOINTS.legacyOrders}?${allQuery}`, token),
  ]
}

async function fetchPaymentRows(token: string, rows: any[]) {
  // Keep a handle on each order so the payment-status result (which has no
  // amount of its own — §3.14) can be enriched with the order's invoicePayment.
  const orders = rows
    .map((row) => ({ trackingNumber: String(row.trackingNumber || row.tracking_number || '').trim(), row }))
    .filter((o) => o.trackingNumber)
    .slice(0, 50)

  const payments = await Promise.all(
    orders.map(async ({ trackingNumber, row }) => {
      const result = await tryAttempt(() =>
        fetchPostEx(`${POSTEX_ENDPOINTS.paymentStatus}/${encodeURIComponent(trackingNumber)}`, token)
      )
      const payment = result?.ok ? result.data?.dist || result.data?.data || result.data : {}
      const amount = Number(row.invoicePayment || row.orderAmount || row.codAmount || row.amount) || 0
      return {
        ...payment,
        trackingNumber: payment?.trackingNumber || trackingNumber,
        orderRefNumber: payment?.orderRefNumber || row.orderRefNumber || '',
        invoicePayment: amount,
        amount,
        cityName: row.cityName || '',
        customerName: row.customerName || '',
        // settle is a boolean in the payment-status response; default to unsettled.
        settle: payment?.settle === true,
        settlementDate: payment?.settlementDate || '',
      }
    })
  )

  return payments
}

export async function POST(request: NextRequest) {
  try {
    const { token, resource } = await request.json()
    const cleanToken = String(token || '').trim()
    const type = resource === 'remittances' ? 'remittances' : 'shipments'

    if (!cleanToken) {
      return NextResponse.json({ error: 'PostEx API token is missing.' }, { status: 400 })
    }

    let lastResult: PostExResult | null = null
    let lastMessage = ''

    for (const attempt of orderAttempts(cleanToken)) {
      const result = await tryAttempt(attempt)
      if (!result) continue
      lastResult = result
      lastMessage = String(postexError(result.data, lastMessage) || lastMessage)

      const rows = normalizeOrderRows(extractRows(result.data))
      if (result.ok && rows.length > 0) {
        if (type === 'remittances') {
          const payments = await fetchPaymentRows(cleanToken, rows)
          return NextResponse.json({ ...result.data, dist: payments })
        }
        return NextResponse.json({ ...result.data, dist: rows })
      }
    }

    // No rows from any attempt — report clearly instead of failing silently.
    if (!lastResult) {
      return NextResponse.json(
        { error: 'Could not reach PostEx. Check your internet connection and API token.' },
        { status: 502 }
      )
    }

    const data = lastResult.data
    const message = String(postexError(data, '') || '')
    const statusCode = Number(data?.statusCode || data?.status || lastResult.status)

    // Authentication/authorization failures should surface as an error.
    if (lastResult.status === 401 || lastResult.status === 403 || statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: `PostEx rejected the API token. ${message || 'Verify the token on your PostEx merchant portal.'}` },
        { status: 401 }
      )
    }

    // Successful call but no orders in range — treat as an empty (not error) result.
    if (lastResult.ok || message.toLowerCase().includes('no message available') || statusCode === 200) {
      return NextResponse.json({
        dist: [],
        warning: `PostEx returned no orders for this account in the selected range. Last API message: ${
          lastMessage || message || 'No response message'
        }`,
      })
    }

    return NextResponse.json(
      { error: postexError(data, `PostEx API error: ${lastResult.status}`), details: data },
      { status: lastResult.status >= 400 ? lastResult.status : 400 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'PostEx request failed.' }, { status: 500 })
  }
}
