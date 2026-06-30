import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateAdRevenue,
  calculateROAS, calculateCODOrders, calculateConfirmedCODOrders, calculateCODConfirmationRate,
  calculateCancelledOrders, calculateCancellationRate, calculateTopProduct, calculateWeakProduct,
  calculateLowStockProducts, calculatePendingFollowups,
} from '@/lib/calculations'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { workspace_id, week_start, week_end } = body

  if (!workspace_id || !week_start || !week_end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const [ordersRes, adsRes, leadsRes, inventoryRes] = await Promise.all([
    supabase.from('orders').select('*').eq('workspace_id', workspace_id).gte('order_date', week_start).lte('order_date', week_end),
    supabase.from('ads').select('*').eq('workspace_id', workspace_id).gte('date', week_start).lte('date', week_end),
    supabase.from('leads').select('*').eq('workspace_id', workspace_id),
    supabase.from('inventory').select('*').eq('workspace_id', workspace_id),
  ])

  const orders = ordersRes.data || []
  const ads = adsRes.data || []
  const leads = leadsRes.data || []
  const inventory = inventoryRes.data || []

  const lowStock = calculateLowStockProducts(inventory)

  const report = {
    workspace_id,
    week_start,
    week_end,
    revenue: calculateRevenue(orders),
    orders_count: calculateOrders(orders),
    aov: calculateAOV(orders),
    ad_spend: calculateAdSpend(ads),
    ad_revenue: calculateAdRevenue(ads),
    roas: calculateROAS(ads),
    cod_orders: calculateCODOrders(orders),
    confirmed_cod_orders: calculateConfirmedCODOrders(orders),
    cod_confirmation_rate: calculateCODConfirmationRate(orders),
    cancelled_orders: calculateCancelledOrders(orders),
    cancellation_rate: calculateCancellationRate(orders),
    top_product: calculateTopProduct(orders),
    weak_product: calculateWeakProduct(orders),
    low_stock_products: lowStock.map((p) => p.product_name).join(', '),
    pending_followups: calculatePendingFollowups(leads),
    summary: `Revenue: Rs ${calculateRevenue(orders).toLocaleString()}, Orders: ${orders.length}, ROAS: ${calculateROAS(ads).toFixed(2)}x`,
  }

  const { data: saved, error } = await supabase
    .from('reports')
    .insert(report)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ report: saved })
}
