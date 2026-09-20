import { SupabaseClient } from '@supabase/supabase-js'
import { isCODPaymentMethod } from '@/lib/calculations'
import { daysAgoDateKey } from '@/lib/date-range'

interface SyncContext {
  supabase: SupabaseClient
  workspaceId: string
  provider: string
  accessToken: string
  refreshToken: string
  shopDomain: string
  adAccountId: string
  ga4PropertyId: string
}

export async function syncShopifyData(ctx: SyncContext) {
  const { supabase, workspaceId, accessToken, refreshToken, shopDomain } = ctx
  const normalizedShopDomain = normalizeShopifyDomain(shopDomain)
  const cleanAccessToken = await resolveShopifyAccessToken(normalizedShopDomain, accessToken, refreshToken)
  if (!normalizedShopDomain || !cleanAccessToken) throw new Error('Missing Shopify credentials')

  const syncRun = await startSyncRun(supabase, workspaceId, 'shopify', 'orders+inventory')

  try {
    const baseUrl = `https://${normalizedShopDomain}/admin/api/2024-01`
    const headers = { 'X-Shopify-Access-Token': cleanAccessToken, 'Content-Type': 'application/json' }

    // Shopify REST caps a page at 250 records. Follow Link pagination so long
    // ranges and larger stores are synced completely rather than silently cut.
    const shopifyOrders = await fetchShopifyCollection<any>(
      `${baseUrl}/orders.json?status=any&limit=250`,
      headers,
      'orders',
      'Shopify orders API'
    )

    // If no orders were returned, check the count endpoint to distinguish
    // "store truly has no orders" from "token lacks read_all_orders scope".
    if (shopifyOrders.length === 0) {
      try {
        const countRes = await fetchWithReadableError(`${baseUrl}/orders/count.json?status=any`, { headers }, 'Shopify orders count API')
        if (countRes.ok) {
          const countData = await countRes.json()
          const totalCount = Number(countData.count || 0)
          if (totalCount > 0) {
            throw new Error(
              `Shopify reports ${totalCount} order(s) exist but this app cannot retrieve them. ` +
              `The connected token is missing the read_all_orders permission. ` +
              `To fix this: add the read_all_orders scope to your Shopify app, then reinstall/reconnect the integration.`
            )
          }
        }
      } catch (countErr: any) {
        // Re-throw only our own descriptive error; swallow count fetch errors
        if (countErr.message?.includes('read_all_orders')) throw countErr
      }
    }

    const mappedOrders = shopifyOrders.map((o) => {
      const paymentMethod = o.gateway || o.payment_gateway_names?.join(', ') || ''
      return {
        workspace_id: workspaceId,
        order_date: o.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        order_id: `SHOP-${o.id}`,
        customer_name: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim(),
        city: o.shipping_address?.city || '',
        product_name: o.line_items?.map((li: any) => li.title).join(', ') || '',
        sku: o.line_items?.[0]?.sku || '',
        quantity: o.line_items?.reduce((s: number, li: any) => s + li.quantity, 0) || 0,
        selling_price: Number(o.total_price) || 0,
        revenue: Number(o.total_price) || 0,
        payment_method: paymentMethod,
        order_status: mapShopifyStatus(o.financial_status, o.fulfillment_status),
        cod_status: isCODPaymentMethod(paymentMethod) ? (o.financial_status === 'paid' ? 'Confirmed' : 'Pending') : 'N/A',
        source: 'shopify',
      }
    })

    // Fetch products/inventory
    let products: any[] = []
    let inventoryFetched = false
    try {
      products = await fetchShopifyCollection<any>(
        `${baseUrl}/products.json?limit=250`,
        headers,
        'products',
        'Shopify products API'
      )
      inventoryFetched = true
    } catch (error) {
      // Missing product/inventory scopes should not discard an otherwise valid
      // order sync. The order data remains useful and the UI can surface scopes.
      console.warn('[sync-engine] Shopify inventory fetch skipped', error)
    }

    const mappedInventory = products.flatMap((product) =>
      (product.variants || []).map((variant: any) => ({
            workspace_id: workspaceId,
            product_name: `${product.title}${variant.title !== 'Default Title' ? ` - ${variant.title}` : ''}`,
            sku: variant.sku || '',
            current_stock: variant.inventory_quantity || 0,
            reorder_level: 10,
            selling_price: Number(variant.price) || 0,
            cost_price: Number(variant.compare_at_price) || 0,
            source: 'shopify',
      }))
    )

    // Replace only provider-owned rows and insert in batches. This removes the
    // previous N+1 select/update loop (two database calls per record).
    const ordersDelete = await supabase
      .from('orders')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('source', 'shopify')
    if (ordersDelete.error) throw ordersDelete.error
    await insertInBatches(supabase, 'orders', mappedOrders)

    if (inventoryFetched) {
      const inventoryDelete = await supabase
        .from('inventory')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('source', 'shopify')
      if (inventoryDelete.error) throw inventoryDelete.error
      await insertInBatches(supabase, 'inventory', mappedInventory)
    }

    const inserted = mappedOrders.length + (inventoryFetched ? mappedInventory.length : 0)

    await finishSyncRun(supabase, syncRun.id, 'success', shopifyOrders.length, inserted, 0)
    return { fetched: shopifyOrders.length, new: inserted, updated: 0 }

  } catch (err: any) {
    await finishSyncRun(supabase, syncRun.id, 'failed', 0, 0, 0, err.message)
    throw err
  }
}

export async function syncMetaAdsData(ctx: SyncContext) {
  const { supabase, workspaceId, accessToken, adAccountId } = ctx
  const cleanAccessToken = accessToken.trim()
  const cleanAdAccountId = adAccountId.trim()
  if (!cleanAccessToken || !cleanAdAccountId) throw new Error('Missing Meta Ads credentials')

  const syncRun = await startSyncRun(supabase, workspaceId, 'meta', 'ads')

  try {
    // Fetch last 90 days of campaign insights
    const sinceStr = daysAgoDateKey(89)
    const untilStr = daysAgoDateKey(0)
    const timeRange = encodeURIComponent(JSON.stringify({ since: sinceStr, until: untilStr }))

    const url = `https://graph.facebook.com/v25.0/${cleanAdAccountId}/insights?` +
      `fields=campaign_name,adset_name,ad_name,spend,impressions,reach,clicks,actions,action_values` +
      `&time_range=${timeRange}` +
      `&level=ad&time_increment=1&limit=500` +
      `&access_token=${encodeURIComponent(cleanAccessToken)}`

    const rows = await fetchAllMetaRows(url)

    const mappedAds = rows.map((r: any) => {
      const purchases = r.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0
      const purchaseRevenue = r.action_values?.find((a: any) => a.action_type === 'purchase')?.value || 0

      return {
        workspace_id: workspaceId,
        date: r.date_start,
        platform: 'Meta',
        campaign_name: r.campaign_name || '',
        ad_set_name: r.adset_name || '',
        ad_name: r.ad_name || '',
        ad_spend: Number(r.spend) || 0,
        impressions: Number(r.impressions) || 0,
        reach: Number(r.reach) || 0,
        clicks: Number(r.clicks) || 0,
        purchases: Number(purchases),
        purchase_revenue: Number(purchaseRevenue),
        source: 'meta',
      }
    })

    const { error: deleteError } = await supabase
      .from('ads')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('source', 'meta')
      .gte('date', sinceStr)
      .lte('date', untilStr)
    if (deleteError) throw deleteError

    await insertInBatches(supabase, 'ads', mappedAds)

    await finishSyncRun(supabase, syncRun.id, 'success', rows.length, mappedAds.length, 0)
    return { fetched: rows.length, new: mappedAds.length, updated: 0 }

  } catch (err: any) {
    await finishSyncRun(supabase, syncRun.id, 'failed', 0, 0, 0, err.message)
    throw err
  }
}

function mapShopifyStatus(financial: string, fulfillment: string): string {
  if (financial === 'refunded') return 'Returned'
  if (financial === 'voided') return 'Cancelled'
  if (fulfillment === 'fulfilled') return 'Delivered'
  if (fulfillment === 'partial') return 'Shipped'
  return 'Pending'
}

async function startSyncRun(supabase: SupabaseClient, workspaceId: string, provider: string, syncType: string) {
  const { data, error } = await supabase
    .from('sync_runs')
    .insert({ workspace_id: workspaceId, provider, sync_type: syncType, status: 'running' })
    .select()
    .single()

  if (error) throw error
  return data
}

async function finishSyncRun(
  supabase: SupabaseClient, runId: string, status: string,
  fetched: number, newRecs: number, updated: number, error?: string
) {
  const { error: updateError } = await supabase
    .from('sync_runs')
    .update({
      status,
      records_fetched: fetched,
      records_new: newRecs,
      records_updated: updated,
      error_message: error || '',
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId)

  if (updateError) {
    console.error('[sync-engine] Failed to update sync run', updateError)
  }
}

function normalizeShopifyDomain(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (parsed.hostname.toLowerCase() === 'admin.shopify.com') {
      const storeHandle = parsed.pathname.split('/').filter(Boolean).at(1)
      return storeHandle ? `${storeHandle}.myshopify.com`.toLowerCase() : ''
    }

    return ensureShopifyHostname(parsed.hostname)
  } catch {
    const hostname = trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase()

    return ensureShopifyHostname(hostname)
  }
}

function ensureShopifyHostname(hostname: string) {
  const clean = hostname.replace(/^www\./i, '').toLowerCase()
  if (!clean) return ''
  return clean.includes('.') ? clean : `${clean}.myshopify.com`
}

function nextShopifyPage(linkHeader: string | null) {
  if (!linkHeader) return ''
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match?.[2] === 'next') return match[1]
  }
  return ''
}

async function fetchShopifyCollection<T>(
  initialUrl: string,
  headers: Record<string, string>,
  key: string,
  label: string
): Promise<T[]> {
  const rows: T[] = []
  let next = initialUrl

  for (let page = 0; next && page < 100; page += 1) {
    const response = await fetchWithReadableError(next, { headers }, label)
    if (response.status === 401) {
      throw new Error('Shopify rejected the saved access token — it may have expired or been revoked. Please reconnect Shopify from the Integrations page.')
    }
    if (!response.ok) throw new Error(await formatHttpError(response, label))

    const body = await response.json()
    rows.push(...(body[key] || []))
    next = nextShopifyPage(response.headers.get('link'))
  }

  if (next) throw new Error(`${label} returned too many pages. Please contact support.`)
  return rows
}

async function fetchAllMetaRows(initialUrl: string) {
  const rows: any[] = []
  let next = initialUrl

  for (let page = 0; next && page < 100; page += 1) {
    const response = await fetchWithReadableError(next, undefined, 'Meta API')
    if (!response.ok) throw new Error(await formatMetaError(response))
    const body = await response.json()
    rows.push(...(body.data || []))
    next = body.paging?.next || ''
  }

  if (next) throw new Error('Meta returned too many pages. Please use a smaller sync range.')
  return rows
}

async function insertInBatches(supabase: SupabaseClient, table: string, rows: Record<string, any>[]) {
  const batchSize = 500
  for (let index = 0; index < rows.length; index += batchSize) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + batchSize))
    if (error) throw error
  }
}

async function fetchWithReadableError(url: string, init: RequestInit | undefined, label: string) {
  try {
    return await fetch(url, init)
  } catch (error: any) {
    const reason = error?.cause?.message || error?.message || 'network request failed'
    throw new Error(`${label} request failed: ${reason}`)
  }
}

async function formatHttpError(response: Response, label: string) {
  const text = await response.text().catch(() => '')
  const message = text.slice(0, 300) || response.statusText
  return `${label}: ${response.status} ${message}`
}

// Meta's raw error JSON (e.g. {"error":{"message":"API access blocked.",...}})
// is unreadable to end users. Give the same actionable guidance the
// Meta Ads dashboard page already shows for this specific failure, and fall
// back to the generic HTTP error formatting for anything else.
async function formatMetaError(response: Response) {
  const text = await response.text().catch(() => '')
  let message = ''
  try {
    message = String(JSON.parse(text)?.error?.message || '')
  } catch {}

  if (message.toLowerCase().includes('api access blocked')) {
    return (
      'Meta API access blocked. Reconnect Meta from Integrations with a fresh token, ' +
      'then verify the Meta app has ads_read permission with Marketing API Access ' +
      'and that this user has access to the selected ad account.'
    )
  }

  return `Meta API: ${response.status} ${message || text.slice(0, 300) || response.statusText}`
}

export async function resolveShopifyAccessToken(shopDomain: string, accessTokenOrClientId: string, clientSecret: string) {
  const accessToken = accessTokenOrClientId.trim()
  const secret = clientSecret.trim()

  // A shpat_/shpca_ token is a real Admin API access token — use it directly,
  // even if a stale client secret is still stored on the connection row.
  if (!secret || /^shp(at|ca)_/.test(accessToken)) return accessToken
  if (!shopDomain || !accessToken) return ''

  const tokenRes = await fetchWithReadableError(
    `https://${shopDomain}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: accessToken,
        client_secret: secret,
      }),
    },
    'Shopify token API'
  )

  const tokenText = await tokenRes.text().catch(() => '')
  const tokenData = safeJson(tokenText)

  if (!tokenRes.ok || !tokenData.access_token) {
    const message = tokenData.error_description || tokenData.error || tokenText || tokenRes.statusText
    if (tokenRes.status === 403) {
      throw new Error('Shopify refused client credentials. Use the store .myshopify.com domain, make sure this app is installed on that store, and set Custom distribution for one store with Admin API scopes.')
    }
    throw new Error(`Shopify could not generate an access token: ${tokenRes.status} ${message}`)
  }

  return tokenData.access_token as string
}

function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
