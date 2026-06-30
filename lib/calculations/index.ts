import type { Order, Ad, Lead, InventoryItem } from '@/lib/types'

export function calculateRevenue(orders: Partial<Order>[]): number {
  return orders
    .filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
    .reduce((sum, o) => sum + (o.revenue || 0), 0)
}

export function calculateOrders(orders: Partial<Order>[]): number {
  return orders.length
}

export function calculateAOV(orders: Partial<Order>[]): number {
  const revenue = calculateRevenue(orders)
  const validOrders = orders.filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
  return validOrders.length === 0 ? 0 : revenue / validOrders.length
}

export function calculateCancelledOrders(orders: Partial<Order>[]): number {
  return orders.filter((o) => o.order_status === 'Cancelled').length
}

export function calculateCancellationRate(orders: Partial<Order>[]): number {
  const total = orders.length
  if (total === 0) return 0
  return (calculateCancelledOrders(orders) / total) * 100
}

export function calculateCODOrders(orders: Partial<Order>[]): number {
  return orders.filter((o) => o.payment_method === 'COD').length
}

export function calculateConfirmedCODOrders(orders: Partial<Order>[]): number {
  return orders.filter((o) => o.payment_method === 'COD' && o.cod_status === 'Confirmed').length
}

export function calculateCODConfirmationRate(orders: Partial<Order>[]): number {
  const codOrders = calculateCODOrders(orders)
  if (codOrders === 0) return 0
  return (calculateConfirmedCODOrders(orders) / codOrders) * 100
}

export function calculateAdSpend(ads: Partial<Ad>[]): number {
  return ads.reduce((sum, a) => sum + (a.ad_spend || 0), 0)
}

export function calculateAdRevenue(ads: Partial<Ad>[]): number {
  return ads.reduce((sum, a) => sum + (a.purchase_revenue || 0), 0)
}

export function calculateROAS(ads: Partial<Ad>[]): number {
  const spend = calculateAdSpend(ads)
  if (spend === 0) return 0
  return calculateAdRevenue(ads) / spend
}

export function calculateTopProduct(orders: Partial<Order>[]): string {
  const validOrders = orders.filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
  const productRevenue: Record<string, number> = {}
  validOrders.forEach((o) => {
    const name = o.product_name || 'Unknown'
    productRevenue[name] = (productRevenue[name] || 0) + (o.revenue || 0)
  })
  const entries = Object.entries(productRevenue)
  if (entries.length === 0) return 'N/A'
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

export function calculateWeakProduct(orders: Partial<Order>[]): string {
  const validOrders = orders.filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
  const productRevenue: Record<string, number> = {}
  validOrders.forEach((o) => {
    const name = o.product_name || 'Unknown'
    productRevenue[name] = (productRevenue[name] || 0) + (o.revenue || 0)
  })
  const entries = Object.entries(productRevenue).filter(([, v]) => v > 0)
  if (entries.length === 0) return 'N/A'
  entries.sort((a, b) => a[1] - b[1])
  return entries[0][0]
}

export function calculateLowStockProducts(inventory: Partial<InventoryItem>[]): Partial<InventoryItem>[] {
  return inventory.filter((i) => (i.current_stock || 0) <= (i.reorder_level || 0))
}

export function calculatePendingFollowups(leads: Partial<Lead>[]): number {
  return leads.filter((l) => l.follow_up_status === 'Pending').length
}

export function getProductPerformance(orders: Partial<Order>[]) {
  const validOrders = orders.filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
  const products: Record<string, { name: string; revenue: number; quantity: number; orders: number }> = {}
  validOrders.forEach((o) => {
    const name = o.product_name || 'Unknown'
    if (!products[name]) products[name] = { name, revenue: 0, quantity: 0, orders: 0 }
    products[name].revenue += o.revenue || 0
    products[name].quantity += o.quantity || 0
    products[name].orders += 1
  })
  return Object.values(products).sort((a, b) => b.revenue - a.revenue)
}

export function getRevenueByDay(orders: Partial<Order>[]) {
  const validOrders = orders.filter((o) => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
  const byDay: Record<string, number> = {}
  validOrders.forEach((o) => {
    const date = o.order_date || ''
    byDay[date] = (byDay[date] || 0) + (o.revenue || 0)
  })
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }))
}

export function getOrdersByDay(orders: Partial<Order>[]) {
  const byDay: Record<string, number> = {}
  orders.forEach((o) => {
    const date = o.order_date || ''
    byDay[date] = (byDay[date] || 0) + 1
  })
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }))
}

export function getAdSpendByCampaign(ads: Partial<Ad>[]) {
  const byCampaign: Record<string, number> = {}
  ads.forEach((a) => {
    const name = a.campaign_name || 'Unknown'
    byCampaign[name] = (byCampaign[name] || 0) + (a.ad_spend || 0)
  })
  return Object.entries(byCampaign).map(([label, value]) => ({ label, value }))
}

export function getROASByCampaign(ads: Partial<Ad>[]) {
  const campaigns: Record<string, { spend: number; revenue: number }> = {}
  ads.forEach((a) => {
    const name = a.campaign_name || 'Unknown'
    if (!campaigns[name]) campaigns[name] = { spend: 0, revenue: 0 }
    campaigns[name].spend += a.ad_spend || 0
    campaigns[name].revenue += a.purchase_revenue || 0
  })
  return Object.entries(campaigns).map(([label, { spend, revenue }]) => ({
    label,
    value: spend === 0 ? 0 : Number((revenue / spend).toFixed(2)),
  }))
}

export function getCODStatusBreakdown(orders: Partial<Order>[]) {
  const codOrders = orders.filter((o) => o.payment_method === 'COD')
  const breakdown: Record<string, number> = {}
  codOrders.forEach((o) => {
    const status = o.cod_status || 'Unknown'
    breakdown[status] = (breakdown[status] || 0) + 1
  })
  return Object.entries(breakdown).map(([label, value]) => ({ label, value }))
}
