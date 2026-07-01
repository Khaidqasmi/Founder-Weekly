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
  topPages: { path: string; title: string; views: number; sessions: number }[]
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
}

function sinceUntil(from: string, to: string) {
  return `SINCE ${from} UNTIL ${to}`
}

async function shopifyQL(domain: string, token: string, qlQuery: string) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { shopifyqlQuery(query: ${JSON.stringify(qlQuery)}) {
        ... on TableResponse { tableData { rowData columns { name dataType } } }
        ... on ParseErrorResponse { parseErrors { code message } }
      } }`,
    }),
  })
  if (!res.ok) throw new Error(`ShopifyQL error: ${res.status}`)
  const json = await res.json()
  const result = json?.data?.shopifyqlQuery
  if (result?.parseErrors?.length) throw new Error(`ShopifyQL parse error: ${result.parseErrors[0].message}`)
  return result?.tableData
}

function tableToObjects(tableData: any): Record<string, any>[] {
  if (!tableData?.rowData || !tableData?.columns) return []
  const cols: string[] = tableData.columns.map((c: any) => c.name)
  return tableData.rowData.map((row: any[]) => {
    const obj: Record<string, any> = {}
    cols.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
}

export async function fetchShopifyAnalytics(
  shopDomain: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<ShopifyAnalytics> {
  if (!shopDomain || !accessToken) throw new Error('Shopify credentials not configured')

  const baseUrl = `https://${shopDomain}/admin/api/2024-10`
  const headers = { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
  const range = sinceUntil(dateFrom, dateTo)

  // ── 1. Try ShopifyQL for real session data ──────────────────────────────
  let sessionRows: Record<string, any>[] = []
  let sessionsByDay: ShopifyAnalytics['sessionsByDay'] = []
  let bounceRate = 0
  let avgSessionDuration = 0
  let conversionRate = 0
  let dataSource: 'shopifyql' | 'estimated' = 'estimated'

  try {
    const sessionsTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions ${range} DIMENSIONS BY day ORDER BY day ASC`
    )
    sessionRows = tableToObjects(sessionsTable)

    if (sessionRows.length > 0) {
      dataSource = 'shopifyql'
      sessionsByDay = sessionRows.map((r) => ({
        date: r.day || r.date || '',
        sessions: Number(r.sessions || 0),
        visitors: Number(r.visitors || r.users || 0),
        bounceRate: Number(r.bounce_rate || 0),
        conversionRate: Number(r.conversion_rate || 0),
      }))
    }
  } catch {}

  // ── 2. Summary sessions via ShopifyQL ───────────────────────────────────
  let totalSessions = 0, totalVisitors = 0
  try {
    const summaryTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions ${range}`
    )
    const rows = tableToObjects(summaryTable)
    if (rows[0]) {
      totalSessions = Number(rows[0].sessions || 0)
      totalVisitors = Number(rows[0].visitors || rows[0].users || 0)
      bounceRate = Number(rows[0].bounce_rate || 0)
      avgSessionDuration = Number(rows[0].avg_session_duration || 0)
      conversionRate = Number(rows[0].conversion_rate || 0)
      dataSource = 'shopifyql'
    }
  } catch {}

  // ── 3. Traffic sources via ShopifyQL ────────────────────────────────────
  let topReferrers: ShopifyAnalytics['topReferrers'] = []
  try {
    const refTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions ${range} DIMENSIONS BY utm_source ORDER BY sessions DESC LIMIT 10`
    )
    const rows = tableToObjects(refTable)
    topReferrers = rows.map((r) => ({
      source: r.utm_source || r.source || 'Direct',
      sessions: Number(r.sessions || 0),
      orders: 0,
      revenue: 0,
    }))
  } catch {}

  // ── 4. Device breakdown via ShopifyQL ───────────────────────────────────
  let deviceBreakdown: ShopifyAnalytics['deviceBreakdown'] = []
  try {
    const devTable = await shopifyQL(shopDomain, accessToken,
      `FROM sessions ${range} DIMENSIONS BY device_type ORDER BY sessions DESC`
    )
    const rows = tableToObjects(devTable)
    const total = rows.reduce((s, r) => s + Number(r.sessions || 0), 0) || 1
    deviceBreakdown = rows.map((r) => ({
      device: String(r.device_type || 'Other'),
      sessions: Number(r.sessions || 0),
      percentage: Math.round((Number(r.sessions || 0) / total) * 100),
    }))
  } catch {}

  // ── 5. Orders from REST API (real sales data) ───────────────────────────
  // Fetch the count first so we can detect missing read_all_orders scope.
  let orderCount = 0
  try {
    const countRes = await fetch(
      `${baseUrl}/orders/count.json?created_at_min=${dateFrom}T00:00:00Z&created_at_max=${dateTo}T23:59:59Z&status=any`,
      { headers }
    )
    if (countRes.ok) {
      const countData = await countRes.json()
      orderCount = Number(countData.count || 0)
    }
  } catch {}

  const ordersRes = await fetch(
    `${baseUrl}/orders.json?created_at_min=${dateFrom}T00:00:00Z&created_at_max=${dateTo}T23:59:59Z&status=any&limit=250&fields=id,total_price,financial_status,source_name,shipping_address,billing_address,line_items,created_at,customer`,
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
      const src = o.source_name || 'Direct'
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
      { device: 'Mobile', sessions: Math.round(totalSessions * 0.68), percentage: 68 },
      { device: 'Desktop', sessions: Math.round(totalSessions * 0.27), percentage: 27 },
      { device: 'Tablet', sessions: Math.round(totalSessions * 0.05), percentage: 5 },
    ]
  }

  const addedToCart = Math.round(totalSessions * 0.08)
  const reachedCheckout = Math.round(totalSessions * 0.04)

  return {
    sessions: totalSessions,
    visitors: totalVisitors,
    pageViews: Math.round(totalSessions * 3.2),
    bounceRate: bounceRate || 42,
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
    topPages: [],
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
  }
}
