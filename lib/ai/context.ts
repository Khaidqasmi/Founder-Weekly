import type { SupabaseClient } from '@supabase/supabase-js'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateAdRevenue,
  calculateROAS, calculateTopProduct, calculateWeakProduct, calculateLowStockProducts,
} from '@/lib/calculations'
import { decryptToken } from '@/lib/crypto'
import { resolveShopifyAccessToken } from '@/lib/integrations/sync-engine'
import { fetchShopifyAnalytics } from '@/lib/integrations/shopify/analytics'

const COURIER_DELIVERED = new Set(['delivered'])
const COURIER_RETURNED_FAILED = new Set(['returned', 'cancelled', 'failed'])
const COURIER_PENDING = new Set(['booked', 'picked', 'in_transit', 'out_for_delivery', 'on_hold'])

export interface AIContext {
  dateRange: { from: string; to: string; label: string }
  shopify: {
    revenue: number
    orders: number
    aov: number
    topProduct: string
    weakProduct: string
  } | null
  analytics: {
    sessions: number
    conversionRate: number
    bounceRate: number
  } | null
  meta: {
    adSpend: number
    roas: number
    ctr: number
    cpc: number
    purchases: number
  } | null
  courier: {
    delivered: number
    pending: number
    returnedFailed: number
  } | null
  inventory: {
    lowStock: string[]
  }
  recentSync: { provider: string; status: string; lastSyncAt: string | null }[]
  warnings: string[]
}

function dateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

/** Resolves a compact from/to range, defaulting to the last 7 days. */
export function resolveDateRange(fromRaw?: string | null, toRaw?: string | null) {
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const to = toRaw && DATE_RE.test(toRaw) ? toRaw : new Date().toISOString().split('T')[0]
  const from = fromRaw && DATE_RE.test(fromRaw) ? fromRaw : dateNDaysAgo(6)
  const label = !fromRaw && !toRaw ? 'last_7_days' : `${from}_to_${to}`
  return { from, to, label }
}

export async function buildAIContext(
  supabase: SupabaseClient,
  workspaceId: string,
  range: { from: string; to: string; label: string }
): Promise<AIContext> {
  const [ordersRes, adsRes, inventoryRes, connectionsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('order_date, order_status, revenue, payment_method, product_name, quantity, source')
      .eq('workspace_id', workspaceId)
      .gte('order_date', range.from)
      .lte('order_date', range.to),
    supabase
      .from('ads')
      .select('date, ad_spend, purchase_revenue, impressions, clicks, purchases, source')
      .eq('workspace_id', workspaceId)
      .gte('date', range.from)
      .lte('date', range.to),
    supabase
      .from('inventory')
      .select('product_name, sku, current_stock, reorder_level')
      .eq('workspace_id', workspaceId),
    supabase
      .from('integration_connections')
      .select('provider, status, last_sync_at, shop_domain, access_token_encrypted, refresh_token_encrypted')
      .eq('workspace_id', workspaceId),
  ])

  const orders = ordersRes.data || []
  const ads = adsRes.data || []
  const inventory = inventoryRes.data || []
  const connections = connectionsRes.data || []

  const warnings: string[] = []

  // Shopify metrics — from synced orders (always available if any orders exist).
  const shopify = orders.length
    ? {
        revenue: calculateRevenue(orders),
        orders: calculateOrders(orders),
        aov: calculateAOV(orders),
        topProduct: calculateTopProduct(orders),
        weakProduct: calculateWeakProduct(orders),
      }
    : null
  if (!shopify) warnings.push('No Shopify order data available for the selected date range.')

  // Meta ads metrics — CTR/CPC derived from raw impression/click totals.
  const totalImpressions = ads.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0)
  const totalClicks = ads.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0)
  const totalPurchases = ads.reduce((sum: number, a: any) => sum + (a.purchases || 0), 0)
  const metaConnection = connections.find((c: any) => c.provider === 'meta')
  const meta = ads.length
    ? {
        adSpend: calculateAdSpend(ads),
        roas: calculateROAS(ads),
        ctr: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        cpc: totalClicks > 0 ? Number((calculateAdSpend(ads) / totalClicks).toFixed(2)) : 0,
        purchases: totalPurchases,
      }
    : null
  if (!meta) {
    if (metaConnection?.status === 'error') {
      warnings.push('Meta data is currently unavailable because the integration needs attention.')
    } else if (!metaConnection || metaConnection.status !== 'connected') {
      warnings.push('Meta Ads is not connected yet.')
    } else {
      warnings.push('No Meta ad data available for the selected date range.')
    }
  }

  // Courier status — derived from the normalized order_status field on synced orders
  // (courier statuses are written here per the "use courier statuses for dashboard" change).
  let courier: AIContext['courier'] = null
  const statusCounts = { delivered: 0, pending: 0, returnedFailed: 0 }
  let recognizedStatusCount = 0
  orders.forEach((o: any) => {
    const status = String(o.order_status || '').toLowerCase().trim()
    if (COURIER_DELIVERED.has(status)) {
      statusCounts.delivered++
      recognizedStatusCount++
    } else if (COURIER_PENDING.has(status)) {
      statusCounts.pending++
      recognizedStatusCount++
    } else if (COURIER_RETURNED_FAILED.has(status)) {
      statusCounts.returnedFailed++
      recognizedStatusCount++
    }
  })
  if (recognizedStatusCount > 0) {
    courier = statusCounts
  } else {
    warnings.push('Courier delivery status is not available for the selected date range.')
  }

  // Shopify-native analytics (sessions/conversion/bounce) — only available if
  // the Shopify integration is connected; falls back to null (never invented).
  let analytics: AIContext['analytics'] = null
  const shopifyConnection = connections.find((c: any) => c.provider === 'shopify' && c.status === 'connected')
  if (shopifyConnection?.shop_domain && shopifyConnection?.access_token_encrypted) {
    try {
      const accessToken = await resolveShopifyAccessToken(
        shopifyConnection.shop_domain,
        decryptToken(shopifyConnection.access_token_encrypted),
        decryptToken(shopifyConnection.refresh_token_encrypted || '')
      )
      const liveAnalytics = await fetchShopifyAnalytics(shopifyConnection.shop_domain, accessToken, range.from, range.to)
      if (liveAnalytics && liveAnalytics.sessions > 0) {
        analytics = {
          sessions: liveAnalytics.sessions,
          conversionRate: liveAnalytics.conversionRate,
          bounceRate: liveAnalytics.bounceRate,
        }
      }
    } catch {
      // Live analytics fetch failed — leave as null rather than guessing.
    }
  }
  if (!analytics) warnings.push('Session/bounce rate analytics are not available for the selected date range.')

  const lowStock = calculateLowStockProducts(inventory)
    .map((p) => p.product_name)
    .filter((name): name is string => !!name)

  const recentSync = connections.map((c: any) => ({
    provider: c.provider,
    status: c.status,
    lastSyncAt: c.last_sync_at || null,
  }))

  return {
    dateRange: range,
    shopify,
    analytics,
    meta,
    courier,
    inventory: { lowStock },
    recentSync,
    warnings,
  }
}
