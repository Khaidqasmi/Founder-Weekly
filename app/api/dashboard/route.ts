import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateAdRevenue,
  calculateROAS, calculateCODOrders, calculateConfirmedCODOrders, calculateCODConfirmationRate,
  calculateCancelledOrders, calculateCancellationRate, calculateTopProduct, calculateWeakProduct,
  calculateLowStockProducts, calculatePendingFollowups, getRevenueByDay, getOrdersByDay,
  getProductPerformance, getAdSpendByCampaign, getROASByCampaign, getOrderStatusBreakdown,
} from '@/lib/calculations'
import { validateDateRange } from '@/lib/date-range'

const PAGE_SIZE = 1000

async function fetchAllPages(fetchPage: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const rows: any[] = []

  for (let page = 0; page < 100; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw error

    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return rows
  }

  throw new Error('Selected range is too large. Please use a smaller date range.')
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'No workspace found' }, { status: 404 })

  const wsId = member.workspace_id

  const url = new URL(request.url)
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || ''
  const hasRange = !!(from || to)

  if (hasRange) {
    const rangeError = validateDateRange(from, to)
    if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 })
  }

  // Fetch only the columns the calculations use — keeps payloads small and queries fast
  const ORDER_COLS = 'order_date, order_status, revenue, payment_method, cod_status, product_name, quantity, source'
  const AD_COLS = 'date, campaign_name, ad_spend, purchase_revenue, source'

  const ordersPage = (pageFrom: number, pageTo: number) => {
    let query = supabase.from('orders').select(ORDER_COLS).eq('workspace_id', wsId)
    if (hasRange) query = query.gte('order_date', from).lte('order_date', to)
    return query.order('order_date', { ascending: false }).range(pageFrom, pageTo)
  }

  const adsPage = (pageFrom: number, pageTo: number) => {
    let query = supabase.from('ads').select(AD_COLS).eq('workspace_id', wsId)
    if (hasRange) query = query.gte('date', from).lte('date', to)
    return query.order('date', { ascending: false }).range(pageFrom, pageTo)
  }

  try {
    const [orders, ads, leadsRes, inventoryRes, actionsRes, trialRes, syncRes] = await Promise.all([
      fetchAllPages(ordersPage),
      fetchAllPages(adsPage),
    supabase.from('leads').select('follow_up_status').eq('workspace_id', wsId),
    supabase.from('inventory').select('product_name, sku, current_stock, reorder_level').eq('workspace_id', wsId),
    supabase.from('action_items').select('*').eq('workspace_id', wsId).neq('status', 'Done').order('created_at', { ascending: false }).limit(5),
    supabase.from('trial_subscriptions').select('*').eq('workspace_id', wsId).maybeSingle(),
    supabase.from('integration_connections').select('provider, status, last_sync_at').eq('workspace_id', wsId),
    ])

    const firstError = [leadsRes, inventoryRes, actionsRes, trialRes, syncRes].find((result) => result.error)?.error
    if (firstError) throw firstError

    const leads = leadsRes.data || []
    const inventory = inventoryRes.data || []
    const actions = actionsRes.data || []
    const trial = trialRes.data
    const connections = syncRes.data || []

  // Data source breakdown
  const orderSources: Record<string, number> = {}
  orders.forEach((o: any) => {
    const src = o.source || 'manual'
    orderSources[src] = (orderSources[src] || 0) + 1
  })

  const adSources: Record<string, number> = {}
  ads.forEach((a: any) => {
    const src = a.source || 'manual'
    adSources[src] = (adSources[src] || 0) + 1
  })

  // Date boundaries of data
  const orderDates = orders.map((o: any) => o.order_date).filter(Boolean).sort()
  const adDates = ads.map((a: any) => a.date).filter(Boolean).sort()
  const allDates = [...orderDates, ...adDates].sort()

    return NextResponse.json({
    metrics: {
      revenue: calculateRevenue(orders),
      orders: calculateOrders(orders),
      aov: calculateAOV(orders),
      adSpend: calculateAdSpend(ads),
      adRevenue: calculateAdRevenue(ads),
      roas: calculateROAS(ads),
      codOrders: calculateCODOrders(orders),
      confirmedCodOrders: calculateConfirmedCODOrders(orders),
      codConfirmationRate: calculateCODConfirmationRate(orders),
      cancelledOrders: calculateCancelledOrders(orders),
      cancellationRate: calculateCancellationRate(orders),
      topProduct: calculateTopProduct(orders),
      weakProduct: calculateWeakProduct(orders),
      lowStockCount: calculateLowStockProducts(inventory).length,
      pendingFollowups: calculatePendingFollowups(leads),
    },
    charts: {
      revenueByDay: getRevenueByDay(orders),
      ordersByDay: getOrdersByDay(orders),
      productPerformance: getProductPerformance(orders),
      adSpendByCampaign: getAdSpendByCampaign(ads),
      roasByCampaign: getROASByCampaign(ads),
      orderStatusBreakdown: getOrderStatusBreakdown(orders),
    },
    lowStockProducts: calculateLowStockProducts(inventory),
    actions,
    trial,
    dataMeta: {
      dateRange: {
        earliest: allDates[0] || null,
        latest: allDates[allDates.length - 1] || null,
        appliedFrom: hasRange ? from : null,
        appliedTo: hasRange ? to : null,
      },
      sources: { orders: orderSources, ads: adSources },
      connections: connections.filter((c: any) => c.status === 'connected'),
      totalOrders: orders.length,
      totalAds: ads.length,
    },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[dashboard] Failed to load dashboard data', error)
    return NextResponse.json(
      { error: 'Dashboard data could not be loaded. Please retry.' },
      { status: 500 }
    )
  }
}
