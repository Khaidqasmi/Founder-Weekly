import { SupabaseClient } from '@supabase/supabase-js'

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
  const { supabase, workspaceId, accessToken, shopDomain } = ctx
  const normalizedShopDomain = normalizeShopifyDomain(shopDomain)
  const cleanAccessToken = accessToken.trim()
  if (!normalizedShopDomain || !cleanAccessToken) throw new Error('Missing Shopify credentials')

  const syncRun = await startSyncRun(supabase, workspaceId, 'shopify', 'orders+inventory')

  try {
    const baseUrl = `https://${normalizedShopDomain}/admin/api/2024-01`
    const headers = { 'X-Shopify-Access-Token': cleanAccessToken, 'Content-Type': 'application/json' }

    // Fetch orders
    const ordersRes = await fetchWithReadableError(`${baseUrl}/orders.json?status=any&limit=250`, { headers }, 'Shopify orders API')
    if (!ordersRes.ok) throw new Error(await formatHttpError(ordersRes, 'Shopify orders API'))
    const ordersData = await ordersRes.json()
    const shopifyOrders = ordersData.orders || []

    let newOrders = 0
    let updatedOrders = 0

    for (const o of shopifyOrders) {
      const mapped = {
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
        payment_method: o.gateway || '',
        order_status: mapShopifyStatus(o.financial_status, o.fulfillment_status),
        cod_status: o.gateway === 'cash_on_delivery' ? (o.financial_status === 'paid' ? 'Confirmed' : 'Pending') : 'N/A',
        source: 'shopify',
      }

      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('order_id', mapped.order_id)
        .single()

      if (existing) {
        const { error } = await supabase.from('orders').update(mapped).eq('id', existing.id)
        if (error) throw error
        updatedOrders++
      } else {
        const { error } = await supabase.from('orders').insert(mapped)
        if (error) throw error
        newOrders++
      }
    }

    // Fetch products/inventory
    const productsRes = await fetchWithReadableError(`${baseUrl}/products.json?limit=250`, { headers }, 'Shopify products API')
    if (productsRes.ok) {
      const productsData = await productsRes.json()
      const products = productsData.products || []
      let newInventory = 0

      for (const p of products) {
        for (const v of p.variants || []) {
          const mapped = {
            workspace_id: workspaceId,
            product_name: `${p.title}${v.title !== 'Default Title' ? ` - ${v.title}` : ''}`,
            sku: v.sku || '',
            current_stock: v.inventory_quantity || 0,
            reorder_level: 10,
            selling_price: Number(v.price) || 0,
            cost_price: Number(v.compare_at_price) || 0,
            source: 'shopify',
          }

          const { data: existing } = await supabase
            .from('inventory')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('sku', mapped.sku)
            .eq('source', 'shopify')
            .single()

          if (existing) {
            const { error } = await supabase.from('inventory').update(mapped).eq('id', existing.id)
            if (error) throw error
          } else {
            const { error } = await supabase.from('inventory').insert(mapped)
            if (error) throw error
            newInventory++
          }
        }
      }
      newOrders += newInventory
    }

    await finishSyncRun(supabase, syncRun.id, 'success', shopifyOrders.length, newOrders, updatedOrders)
    return { fetched: shopifyOrders.length, new: newOrders, updated: updatedOrders }

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
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const sinceStr = since.toISOString().split('T')[0]
    const untilStr = new Date().toISOString().split('T')[0]

    const url = `https://graph.facebook.com/v18.0/${cleanAdAccountId}/insights?` +
      `fields=campaign_name,adset_name,ad_name,spend,impressions,reach,clicks,actions,action_values` +
      `&time_range={"since":"${sinceStr}","until":"${untilStr}"}` +
      `&level=ad&time_increment=1&limit=500` +
      `&access_token=${cleanAccessToken}`

    const res = await fetchWithReadableError(url, undefined, 'Meta API')
    if (!res.ok) throw new Error(await formatHttpError(res, 'Meta API'))
    const data = await res.json()
    const rows = data.data || []

    let newAds = 0
    let updatedAds = 0

    for (const r of rows) {
      const purchases = r.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0
      const purchaseRevenue = r.action_values?.find((a: any) => a.action_type === 'purchase')?.value || 0

      const mapped = {
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

      // Deduplicate by date + campaign + ad
      const { data: existing } = await supabase
        .from('ads')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('date', mapped.date)
        .eq('campaign_name', mapped.campaign_name)
        .eq('ad_name', mapped.ad_name)
        .eq('source', 'meta')
        .single()

      if (existing) {
        const { error } = await supabase.from('ads').update(mapped).eq('id', existing.id)
        if (error) throw error
        updatedAds++
      } else {
        const { error } = await supabase.from('ads').insert(mapped)
        if (error) throw error
        newAds++
      }
    }

    await finishSyncRun(supabase, syncRun.id, 'success', rows.length, newAds, updatedAds)
    return { fetched: rows.length, new: newAds, updated: updatedAds }

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
