import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateAdRevenue,
  calculateROAS, calculateCODOrders, calculateConfirmedCODOrders, calculateCODConfirmationRate,
  calculateCancelledOrders, calculateCancellationRate, calculateTopProduct, calculateWeakProduct,
  calculateLowStockProducts, calculatePendingFollowups, getRevenueByDay, getOrdersByDay,
  getProductPerformance, getAdSpendByCampaign, getROASByCampaign, getCODStatusBreakdown,
} from '@/lib/calculations'

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

  // Date range from query params
  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let ordersQuery = supabase.from('orders').select('*').eq('workspace_id', wsId)
  let adsQuery = supabase.from('ads').select('*').eq('workspace_id', wsId)

  if (from) {
    ordersQuery = ordersQuery.gte('order_date', from)
    adsQuery = adsQuery.gte('date', from)
  }
  if (to) {
    ordersQuery = ordersQuery.lte('order_date', to)
    adsQuery = adsQuery.lte('date', to)
  }

  ordersQuery = ordersQuery.order('order_date', { ascending: false })
  adsQuery = adsQuery.order('date', { ascending: false })

  const [ordersRes, adsRes, leadsRes, inventoryRes, actionsRes, trialRes, syncRes] = await Promise.all([
    ordersQuery,
    adsQuery,
    supabase.from('leads').select('*').eq('workspace_id', wsId),
    supabase.from('inventory').select('*').eq('workspace_id', wsId),
    supabase.from('action_items').select('*').eq('workspace_id', wsId).neq('status', 'Done').order('created_at', { ascending: false }).limit(5),
    supabase.from('trial_subscriptions').select('*').eq('workspace_id', wsId).single(),
    supabase.from('integration_connections').select('provider, status, last_sync_at').eq('workspace_id', wsId),
  ])

  const orders = ordersRes.data || []
  const ads = adsRes.data || []
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
      codStatusBreakdown: getCODStatusBreakdown(orders),
    },
    lowStockProducts: calculateLowStockProducts(inventory),
    actions,
    trial,
    dataMeta: {
      dateRange: {
        earliest: allDates[0] || null,
        latest: allDates[allDates.length - 1] || null,
        appliedFrom: from || null,
        appliedTo: to || null,
      },
      sources: { orders: orderSources, ads: adSources },
      connections: connections.filter((c: any) => c.status === 'connected'),
      totalOrders: orders.length,
      totalAds: ads.length,
    },
  })
}
