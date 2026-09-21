import 'server-only'
import { NextResponse } from 'next/server'

// PostEx Merchant API integration (Guide v4.1.9)
// Server-side proxy so the merchant token never touches the browser and CORS is avoided.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Several upstream attempts can add up; without this Vercel kills the function
// at its default limit and the panel gets a 504 instead of shipments.
export const maxDuration = 60

// Per-attempt timeout so one slow PostEx endpoint can't eat the whole budget.
const ATTEMPT_TIMEOUT_MS = 8000

const POSTEX_ENDPOINTS = {
  // §3.16 List Orders API — GET with query-string params (orderStatusID,
  // startDate, endDate). The guide's "params sent as a JSON body" note does
  // not match the live gateway's Spring @RequestParam-based implementation.
  allOrders: 'https://api.postex.pk/services/integration/api/order/v1/get-all-order',
  // §3.6 List Un-booked Orders — GET with startDate/endDate.
  unbookedOrders: 'https://api.postex.pk/services/integration/api/order/v2/get-unbooked-orders',
  // §3.14 Payment Status API — GET /payment-status/{trackingNumber}.
  paymentStatus: 'https://api.postex.pk/services/integration/api/order/v1/payment-status',
  // Legacy endpoint kept as a last-resort fallback for older accounts.
  legacyOrders: 'https://api.postex.pk/services/integration/api/order/v3/all-orders',
}

// §3.15 Order Status API — documented orderStatusID values. Some PostEx gateway
// deployments do not honor "0 = all orders" (despite the guide saying they do)
// and silently return an empty list for it, even though the account has plenty
// of orders sitting in other statuses. Querying every real status individually
// and merging is the only way to reliably get the full order list in that case.
const ALL_ORDER_STATUS_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 16, 17, 18]

function isoDateKey(date: Date) {
  // yyyy-mm-dd, as both date-range parameters require.
  return date.toISOString().split('T')[0]
}

// A single wide window keeps the number of upstream calls small while still
// covering practically every order. toDate is pushed to tomorrow so orders
// created "today" in PKT are never missed due to UTC offset.
//
// The guide (§3.16.2) documents get-all-order's parameters as fromDate/toDate,
// but the live gateway rejects that with "Required String parameter 'startDate'
// is not present" — it actually wants startDate/endDate, the same names used
// by get-unbooked-orders (§3.6.2). Both pairs of keys are sent on every call so
// this keeps working regardless of which name a given PostEx account/gateway
// version expects.
function dateWindow() {
  const to = new Date()
  to.setDate(to.getDate() + 1)
  const from = new Date()
  from.setDate(from.getDate() - 1095) // ~3 years back
  const fromKey = isoDateKey(from)
  const toKey = isoDateKey(to)
  return { fromDate: fromKey, toDate: toKey, startDate: fromKey, endDate: toKey }
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
type AttemptLog = { source: string; status: number; ok: boolean; rowCount: number; message: string }

// Fetch wrapper used for every PostEx call — all order-fetch calls use GET
// with query-string parameters (see fetchAllOrders).
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
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  })
  const data = safeJson(await res.text())
  return { status: res.status, ok: res.ok, data }
}

async function tryAttempt(fn: () => Promise<PostExResult>): Promise<PostExResult | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

function dedupeByTrackingNumber(rows: any[]) {
  const seen = new Map<string, any>()
  for (const row of rows) {
    const key = String(row.trackingNumber || row.tracking_number || '').trim()
    if (!key) continue
    if (!seen.has(key)) seen.set(key, row)
  }
  return [...seen.values()]
}

/**
 * Fetch every order across every status, merged and de-duplicated.
 *
 * "orderStatusID: 0" is documented as meaning "all orders", but some PostEx
 * gateway deployments silently return an empty list for it — the fast path
 * below has been observed to succeed (HTTP 200) with zero rows while orders
 * genuinely exist in other statuses. When that happens, every real status ID
 * is queried in parallel and the results merged so nothing is missed.
 */
async function fetchAllOrders(token: string): Promise<{ rows: any[]; source: string; attempts: AttemptLog[] }> {
  const { fromDate, toDate, startDate, endDate } = dateWindow()
  const attempts: AttemptLog[] = []

  const record = (source: string, result: PostExResult | null, rows: any[]) => {
    attempts.push({
      source,
      status: result?.status ?? 0,
      ok: result?.ok ?? false,
      rowCount: rows.length,
      message: result ? String(postexError(result.data, '') || '') : 'request failed',
    })
  }

  // The live gateway is a Java Spring @RequestParam GET handler, which only
  // reads the QUERY STRING (never a JSON body, no matter what the guide says
  // about "GET with a body") — confirmed by "Required String parameter
  // 'startDate' is not present" until dates were moved to the query string.
  // The next error was "Required Integer parameter 'orderStatusId' is not
  // present": the real parameter name is camelCase orderStatusId, not the
  // guide's orderStatusID. Sending both keys at once triggers a server-side
  // "Impossible modulus" error (likely a duplicate-key collision), so only
  // the confirmed-correct camelCase name is sent.
  const allQueryParams = (statusId: number) =>
    new URLSearchParams({
      orderStatusId: String(statusId),
      fromDate,
      toDate,
      startDate,
      endDate,
    }).toString()

  // Fast path: orderStatusID = 0 ("all orders" per the guide).
  const fastResult = await tryAttempt(() => fetchPostEx(`${POSTEX_ENDPOINTS.allOrders}?${allQueryParams(0)}`, token))
  const fastRows = fastResult ? normalizeOrderRows(extractRows(fastResult.data)) : []
  record('get-all-order status=0 (GET query)', fastResult, fastRows)
  if (fastResult?.ok && fastRows.length > 0) {
    return { rows: fastRows, source: 'get-all-order status=0 (GET query)', attempts }
  }

  // Fallback: query every documented status in parallel and merge. Also pull
  // Un-booked Orders (§3.6), which is a separate endpoint from get-all-order
  // and has proven reliable even when the "all" query returns nothing.
  const statusCalls = ALL_ORDER_STATUS_IDS.map(async (statusId) => {
    const result = await tryAttempt(() => fetchPostEx(`${POSTEX_ENDPOINTS.allOrders}?${allQueryParams(statusId)}`, token))
    const rows = result ? normalizeOrderRows(extractRows(result.data)) : []
    record(`get-all-order status=${statusId} (GET query)`, result, rows)
    return rows
  })

  const unbookedQuery = new URLSearchParams({ startDate, endDate }).toString()
  const unbookedCall = (async () => {
    const result = await tryAttempt(() => fetchPostEx(`${POSTEX_ENDPOINTS.unbookedOrders}?${unbookedQuery}`, token))
    const rows = result ? normalizeOrderRows(extractRows(result.data)) : []
    record('get-unbooked-orders (GET query)', result, rows)
    return rows
  })()

  const [statusRowSets, unbookedRows] = await Promise.all([Promise.all(statusCalls), unbookedCall])
  const merged = dedupeByTrackingNumber([...statusRowSets.flat(), ...unbookedRows])

  if (merged.length > 0) {
    return { rows: merged, source: 'get-all-order per-status + get-unbooked-orders (merged)', attempts }
  }

  // Last resort: legacy v3 endpoint for older accounts.
  const legacyResult = await tryAttempt(() => fetchPostEx(`${POSTEX_ENDPOINTS.legacyOrders}?${allQueryParams(0)}`, token))
  const legacyRows = legacyResult ? normalizeOrderRows(extractRows(legacyResult.data)) : []
  record('legacy v3 all-orders', legacyResult, legacyRows)

  return { rows: legacyRows, source: 'legacy v3 all-orders', attempts }
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

export async function postexResponse(token: string, resource: string) {
  try {
    const cleanToken = String(token || '').trim()
    const type = resource === 'remittances' ? 'remittances' : 'shipments'

    if (!cleanToken) {
      return NextResponse.json({ error: 'PostEx API token is missing.' }, { status: 400 })
    }

    const { rows, source, attempts } = await fetchAllOrders(cleanToken)

    if (rows.length > 0) {
      if (type === 'remittances') {
        const payments = await fetchPaymentRows(cleanToken, rows)
        return NextResponse.json({ statusCode: '200', dist: payments, source, attempts })
      }
      return NextResponse.json({ statusCode: '200', dist: rows, source, attempts })
    }

    // Every status came back empty — check whether that's an auth problem or
    // a genuinely empty account before reporting.
    const authFailure = attempts.find((a) => a.status === 401 || a.status === 403)
    if (authFailure) {
      return NextResponse.json(
        { error: `PostEx rejected the API token. ${authFailure.message || 'Verify the token on your PostEx merchant portal.'}`, attempts },
        { status: 401 }
      )
    }

    const reachedServer = attempts.some((a) => a.status > 0)
    if (!reachedServer) {
      return NextResponse.json(
        { error: 'Could not reach PostEx. Check your internet connection and API token.', attempts },
        { status: 502 }
      )
    }

    return NextResponse.json({
      dist: [],
      source,
      attempts,
      warning: 'PostEx returned no orders in any status for this account across the last 3 years.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'PostEx request failed.' }, { status: 500 })
  }
}

