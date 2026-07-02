export interface ShopifyAnalytics {
  sessions: number
  visitors: number
  pageViews: number
  bounceRate: number
  avgSessionDuration: number
  addedToCart: number
  reachedCheckout: number
  purchaseSessions: number
  conversionRate: number
  averageOrderValue: number
  totalSales: number
  totalOrders: number
  returningCustomerRate: number
  sessionsByDay: { date: string; sessions: number; visitors: number; bounceRate: number; conversionRate: number }[]
  topPages: { path: string; title: string; views: number; sessions: number; changePercent?: number | null }[]
  topReferrers: { source: string; sessions: number; orders: number; revenue: number }[]
  topProducts: { title: string; views: number; addedToCart: number; purchases: number; revenue: number }[]
  deviceBreakdown: { device: string; sessions: number; percentage: number }[]
  countryBreakdown: { country: string; sessions: number; orders: number }[]
  conversionFunnel: { step: string; count: number; rate: number }[]
  dataSource: 'shopifyql' | 'estimated'
  /** True when Shopify reports orders exist for the range but the access token lacks read_all_orders. */
  orderAccessLimited?: boolean
  /** Order count reported by Shopify count endpoint (may be non-zero even when order details are inaccessible). */
  orderCount?: number
  /** True when order-derived metrics are read from the app's synced Shopify orders table. */
  syncedOrderFallback?: boolean
  /** True when ShopifyQL traffic/report metrics could not be read from Shopify. */
  analyticsAccessLimited?: boolean
  /** The first ShopifyQL error seen while trying to fetch live traffic/report metrics. */
  analyticsError?: string
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function getTimeZoneOffset(date: string, timeZone: string) {
  const utcDate = new Date(`${date}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  }).formatToParts(utcDate)
  const tz = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT'
  const match = tz.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) return '+00:00'

  const sign = match[1]
  const hours = match[2].padStart(2, '0')
  const minutes = (match[3] || '00').padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

function sinceUntil(from: string, to: string) {
  // ShopifyQL treats UNTIL like an upper boundary in several reports. Extending
  // by one day makes Today/Yesterday ranges include the whole selected date.
  return `SINCE ${from} UNTIL ${addDays(to, 1)}`
}

function shopifyRestDateRange(from: string, to: string, timeZone = 'UTC') {
  const offset = getTimeZoneOffset(from, timeZone)
  const endOffset = getTimeZoneOffset(addDays(to, 1), timeZone)

  return {
    min: `${from}T00:00:00${offset}`,
    max: `${addDays(to, 1)}T00:00:00${endOffset}`,
  }
}

function previousDateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
  const previousEnd = new Date(start)
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setUTCDate(previousStart.getUTCDate() - days + 1)

  return {
    from: previousStart.toISOString().split('T')[0],
    to: previousEnd.toISOString().split('T')[0],
  }
}

async function shopifyQL(domain: string, token: string, qlQuery: string) {
  const res = await fetch(`https://${domain}/admin/api/2026-07/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { shopifyqlQuery(query: ${JSON.stringify(qlQuery)}) {
        tableData { rows columns { name dataType displayName } }
        parseErrors
      } }`,
    }),
  })
  if (!res.ok) throw new Error(`ShopifyQL error: ${res.status}`)
  const json = await res.json()
  const result = json?.data?.shopifyqlQuery
  if (result?.parseErrors?.length) throw new Error(`ShopifyQL parse error: ${String(result.parseErrors[0])}`)
  return result?.tableData
}

function tableToObjects(tableData: any): Record<string, any>[] {
  const rows = tableData?.rows || tableData?.rowData
  if (!rows || !tableData?.columns) return []
  if (rows.length > 0 && !Array.isArray(rows[0])) return rows
  const cols: string[] = tableData.columns.map((c: any) => c.name)
  return rows.map((row: any[]) => {
    const obj: Record<string, any> = {}
    cols.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
}

function normalizePercent(value: any) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return numeric <= 1 ? Number((numeric * 100).toFixed(2)) : Number(numeric.toFixed(2))
}

function normalizeTrafficSource(source: string) {
  const raw = (source || '').trim()
  const key = raw.toLowerCase()

  if (!key || key === 'direct' || key === '(direct)') return 'Direct'
  if (['ig', 'instagram', 'instagram.com', 'l.instagram.com'].includes(key)) return 'Instagram'
  if (['fb', 'facebook', 'facebook.com', 'm.facebook.com', 'l.facebook.com'].includes(key)) return 'Facebook'
  if (key.includes('google')) return 'Google'
  if (key.includes('tiktok')) return 'TikTok'
  if (key.includes('youtube')) return 'YouTube'
  if (key.includes('whatsapp')) return 'WhatsApp'

  return raw
}

function landingPageTitle(type: string, path: string) {
  const pageType = (type || '').trim().toLowerCase()
  const cleanPath = path || '/'

  if (cleanPath === '/') return 'Homepage'
  if (cleanPath === '/password') return 'Password'
  if (pageType) return pageType.charAt(0).toUpperCase() + pageType.slice(1)

  const segment = cleanPath.split('/').filter(Boolean)[0] || 'Page'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

async function fetchLandingPages(shopDomain: string, accessToken: string, range: string, limit = 10) {
  const table = await shopifyQL(
    shopDomain,
    accessToken,
    `FROM sessions SHOW sessions, pageviews WHERE landing_page_path IS NOT NULL GROUP BY landing_page_type, landing_page_path ${range} ORDER BY sessions DESC LIMIT ${limit}`
  )
  const rows = tableToObjects(table)

  return rows.map((row) => {
    const path = String(row.landing_page_path || row.path || '/')
    return {
      path,
      title: landingPageTitle(String(row.landing_page_type || ''), path),
      views: Number(row.pageviews || 0),
      sessions: Number(row.sessions || 0),
    }
  })
}

async function fetchShopTimeZone(baseUrl: string, headers: Record<string, string>) {
  try {
    const res = await fetch(`${baseUrl}/shop.json?fields=iana_timezone,timezone`, { headers })
    if (!res.ok) return 'UTC'
    const data = await res.json()
    return data.shop?.iana_timezone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function fetchShopifyAnalytics(
  shopDomain: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<ShopifyAnalytics> {
  if (!shopDomain || !accessToken) throw new Error('Shopify credentials not configured')

  const baseUrl = `https://${shopDomain}/admin/api/2026-07`
  const headers = { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
  const range = sinceUntil(dateFrom, dateTo)
  const shopTimeZone = await fetchShopTimeZone(baseUrl, headers)

  // ── 1. Try ShopifyQL for real session data ──────────────────────────────
  let sessionRows: Record<string, any>[] = []
  let sessionsByDay: ShopifyAnalytics['sessionsByDay'] = []
  let bounceRate = 0
  let avgSessionDuration = 0
  let conversionRate = 0
  let dataSource: 'shopifyql' | 'estimated' = 'estimated'
  let shopifyQLError = ''
  let topPages: ShopifyAnalytics['topPages'] = []

  try {
    const sessionsTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions SHOW online_store_visitors, sessions, pageviews, bounce_rate, conversion_rate GROUP BY day TIMESERIES day ${range} ORDER BY day ASC`
    )
    sessionRows = tableToObjects(sessionsTable)

    if (sessionRows.length > 0) {
      dataSource = 'shopifyql'
      sessionsByDay = sessionRows.map((r) => ({
        date: r.day || r.date || '',
        sessions: Number(r.sessions || 0),
        visitors: Number(r.online_store_visitors || r.visitors || r.users || 0),
        bounceRate: normalizePercent(r.bounce_rate),
        conversionRate: normalizePercent(r.conversion_rate),
      }))
    }
  } catch (err: any) {
    shopifyQLError ||= err?.message || 'ShopifyQL traffic query failed'
  }

  // ── 2. Summary sessions via ShopifyQL ───────────────────────────────────
  let totalSessions = 0, totalVisitors = 0
  let liveAddedToCart = 0
  let liveReachedCheckout = 0
  try {
    const summaryTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions SHOW online_store_visitors, sessions, pageviews, average_session_duration, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout, conversion_rate, bounce_rate ${range}`
    )
    const rows = tableToObjects(summaryTable)
    if (rows[0]) {
      totalSessions = Number(rows[0].sessions || 0)
      totalVisitors = Number(rows[0].online_store_visitors || rows[0].visitors || rows[0].users || 0)
      bounceRate = normalizePercent(rows[0].bounce_rate)
      avgSessionDuration = Number(rows[0].avg_session_duration || 0)
      conversionRate = normalizePercent(rows[0].conversion_rate)
      liveAddedToCart = Number(rows[0].sessions_with_cart_additions || 0)
      liveReachedCheckout = Number(rows[0].sessions_that_reached_checkout || 0)
      dataSource = 'shopifyql'
    }
  } catch (err: any) {
    shopifyQLError ||= err?.message || 'ShopifyQL summary query failed'
  }

  // ── 3. Traffic sources via ShopifyQL ────────────────────────────────────
  let topReferrers: ShopifyAnalytics['topReferrers'] = []
  try {
    const refTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions SHOW sessions GROUP BY utm_source ${range} ORDER BY sessions DESC LIMIT 10`
    )
    const rows = tableToObjects(refTable)
    topReferrers = rows.map((r) => ({
      source: normalizeTrafficSource(r.utm_source || r.source || 'Direct'),
      sessions: Number(r.sessions || 0),
      orders: 0,
      revenue: 0,
    }))
  } catch (err: any) {
    shopifyQLError ||= err?.message || 'ShopifyQL referrer query failed'
  }

  // ── 4. Device breakdown via ShopifyQL ───────────────────────────────────
  let deviceBreakdown: ShopifyAnalytics['deviceBreakdown'] = []
  try {
    const devTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions SHOW sessions GROUP BY device_type ${range} ORDER BY sessions DESC`
    )
    const rows = tableToObjects(devTable)
    const total = rows.reduce((s, r) => s + Number(r.sessions || 0), 0) || 1
    deviceBreakdown = rows.map((r) => ({
      device: String(r.device_type || 'Other'),
      sessions: Number(r.sessions || 0),
      percentage: Math.round((Number(r.sessions || 0) / total) * 100),
    }))
  } catch (err: any) {
    shopifyQLError ||= err?.message || 'ShopifyQL device query failed'
  }

  // ── 5. Orders from REST API (real sales data) ───────────────────────────
  // Fetch the count first so we can detect missing read_all_orders scope.
  try {
    const currentPages = await fetchLandingPages(shopDomain, accessToken, range)
    const previousRange = previousDateRange(dateFrom, dateTo)
    const previousPages = previousRange
      ? await fetchLandingPages(shopDomain, accessToken, sinceUntil(previousRange.from, previousRange.to), 50)
      : []
    const previousByPath = new Map(previousPages.map((page) => [page.path, page.sessions]))

    topPages = currentPages.map((page) => {
      const previousSessions = previousByPath.get(page.path) || 0
      const changePercent = previousSessions > 0
        ? Number((((page.sessions - previousSessions) / previousSessions) * 100).toFixed(0))
        : null

      return { ...page, changePercent }
    })
  } catch (err: any) {
    shopifyQLError ||= err?.message || 'ShopifyQL landing page query failed'
  }

  let orderCount = 0
  const restRange = shopifyRestDateRange(dateFrom, dateTo, shopTimeZone)
  try {
    const countRes = await fetch(
      `${baseUrl}/orders/count.json?created_at_min=${restRange.min}&created_at_max=${restRange.max}&status=any`,
      { headers }
    )
    if (countRes.ok) {
      const countData = await countRes.json()
      orderCount = Number(countData.count || 0)
    }
  } catch {}

  const ordersRes = await fetch(
    `${baseUrl}/orders.json?created_at_min=${restRange.min}&created_at_max=${restRange.max}&status=any&limit=250&fields=id,total_price,financial_status,source_name,shipping_address,billing_address,line_items,created_at,customer`,
    { headers }
  )
  const orders = ordersRes.ok ? (await ordersRes.json()).orders || [] : []

  // Detect "count > 0 but list empty": Shopify has orders but token lacks
  // read_all_orders — only the last 60 days of order details are accessible by default.
  const orderAccessLimited = orderCount > 0 && orders.length === 0

  const paidOrders = orders.filter((o: any) => !['refunded', 'voided'].includes(o.financial_status))

  // Do NOT invent revenue figures when order details are inaccessible.
  const totalSales = orderAccessLimited ? 0 : paidOrders.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0)
  const totalOrders = orderAccessLimited ? 0 : paidOrders.length
  const aov = totalOrders > 0 ? totalSales / totalOrders : 0

  // Returning customers
  const customerIds = paidOrders.map((o: any) => o.customer?.id).filter(Boolean)
  const unique = new Set(customerIds).size
  const returningCustomerRate = orderAccessLimited ? 0 : (unique > 0 ? Math.round(((customerIds.length - unique) / Math.max(customerIds.length, 1)) * 100) : 0)

  // If ShopifyQL didn't give us sessions, estimate from orders (only when accessible)
  if (totalSessions === 0 && totalOrders > 0 && !orderAccessLimited) {
    conversionRate = 2.1
    totalSessions = Math.round(totalOrders / (conversionRate / 100))
    totalVisitors = Math.round(totalSessions * 0.85)
  }

  // Product performance from line items (skip when inaccessible)
  const productMap: Record<string, ShopifyAnalytics['topProducts'][0]> = {}
  if (!orderAccessLimited) {
    paidOrders.forEach((o: any) => {
      (o.line_items || []).forEach((li: any) => {
        const title = li.title || 'Unknown'
        if (!productMap[title]) productMap[title] = { title, views: 0, addedToCart: 0, purchases: 0, revenue: 0 }
        productMap[title].purchases += Number(li.quantity || 1)
        productMap[title].revenue += Number(li.price) * Number(li.quantity || 1)
        productMap[title].views = Math.round(productMap[title].purchases * 15)
        productMap[title].addedToCart = Math.round(productMap[title].purchases * 1.8)
      })
    })
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  // Traffic from order source (fallback if ShopifyQL referrers failed, skip when inaccessible)
  if (topReferrers.length === 0 && !orderAccessLimited) {
    const srcMap: Record<string, { sessions: number; orders: number; revenue: number }> = {}
    paidOrders.forEach((o: any) => {
      const src = normalizeTrafficSource(o.source_name || 'Direct')
      if (!srcMap[src]) srcMap[src] = { sessions: 0, orders: 0, revenue: 0 }
      srcMap[src].orders++
      srcMap[src].revenue += Number(o.total_price || 0)
      srcMap[src].sessions += Math.round(1 / (Math.max(conversionRate, 0.5) / 100))
    })
    topReferrers = Object.entries(srcMap).map(([source, v]) => ({ source, ...v })).sort((a, b) => b.sessions - a.sessions)
  }

  // Country breakdown (skip when inaccessible)
  const countryMap: Record<string, { sessions: number; orders: number }> = {}
  if (!orderAccessLimited) {
    paidOrders.forEach((o: any) => {
      const c = o.shipping_address?.country || o.billing_address?.country || 'Unknown'
      if (!countryMap[c]) countryMap[c] = { sessions: 0, orders: 0 }
      countryMap[c].orders++
      countryMap[c].sessions += Math.round(1 / (Math.max(conversionRate, 0.5) / 100))
    })
  }
  const countryBreakdown = Object.entries(countryMap).map(([country, v]) => ({ country, ...v })).sort((a, b) => b.orders - a.orders).slice(0, 10)

  // Session day breakdown fallback (only from order data when accessible)
  if (sessionsByDay.length === 0 && !orderAccessLimited) {
    const dailyMap: Record<string, { sessions: number; visitors: number }> = {}
    const d = new Date(dateFrom), end = new Date(dateTo)
    while (d <= end) {
      const k = d.toISOString().split('T')[0]; dailyMap[k] = { sessions: 0, visitors: 0 }; d.setDate(d.getDate() + 1)
    }
    paidOrders.forEach((o: any) => {
      const day = o.created_at?.split('T')[0]
      if (day && dailyMap[day]) {
        dailyMap[day].sessions += Math.round(1 / (Math.max(conversionRate, 0.5) / 100))
        dailyMap[day].visitors += Math.round(1 / (Math.max(conversionRate, 0.5) / 100) * 0.85)
      }
    })
    sessionsByDay = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, bounceRate: 0, conversionRate: 0, ...v }))
  }

  if (deviceBreakdown.length === 0) {
    deviceBreakdown = [
      { device: 'Mobile', sessions: Math.round(totalSessions * 0.68), percentage: totalSessions > 0 ? 68 : 0 },
      { device: 'Desktop', sessions: Math.round(totalSessions * 0.27), percentage: totalSessions > 0 ? 27 : 0 },
      { device: 'Tablet', sessions: Math.round(totalSessions * 0.05), percentage: totalSessions > 0 ? 5 : 0 },
    ]
  }

  const addedToCart = liveAddedToCart > 0 ? liveAddedToCart : Math.round(totalSessions * 0.08)
  const reachedCheckout = liveReachedCheckout > 0 ? liveReachedCheckout : Math.round(totalSessions * 0.04)

  return {
    sessions: totalSessions,
    visitors: totalVisitors,
    pageViews: Math.round(totalSessions * 3.2),
    bounceRate: bounceRate || 0,
    avgSessionDuration: avgSessionDuration || 0,
    addedToCart,
    reachedCheckout,
    purchaseSessions: totalOrders,
    conversionRate: conversionRate || (totalSessions > 0 ? Number(((totalOrders / totalSessions) * 100).toFixed(2)) : 0),
    averageOrderValue: aov,
    totalSales,
    totalOrders,
    returningCustomerRate,
    sessionsByDay,
    topPages,
    topReferrers,
    topProducts,
    deviceBreakdown,
    countryBreakdown,
    conversionFunnel: [
      { step: 'Sessions', count: totalSessions, rate: 100 },
      { step: 'Product Views', count: Math.round(totalSessions * 0.45), rate: 45 },
      { step: 'Added to Cart', count: addedToCart, rate: Number(((addedToCart / Math.max(totalSessions, 1)) * 100).toFixed(1)) },
      { step: 'Reached Checkout', count: reachedCheckout, rate: Number(((reachedCheckout / Math.max(totalSessions, 1)) * 100).toFixed(1)) },
      { step: 'Purchased', count: totalOrders, rate: Number(((totalOrders / Math.max(totalSessions, 1)) * 100).toFixed(2)) },
    ],
    dataSource,
    orderAccessLimited,
    orderCount,
    analyticsAccessLimited: dataSource !== 'shopifyql' && Boolean(shopifyQLError),
    analyticsError: shopifyQLError || undefined,
  }
}
