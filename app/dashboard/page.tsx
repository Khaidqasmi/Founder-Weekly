'use client'

import { useEffect, useState } from 'react'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SimpleBarChart } from '@/components/charts/bar-chart'
import { SimplePieChart } from '@/components/charts/pie-chart'
import { LinkButton } from '@/components/link-button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatNumber, formatPercent, getTrialDaysRemaining } from '@/lib/utils'
import { LoadingSpinner } from '@/components/loading'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { demoOrders, demoAds, demoLeads, demoInventory, demoActions } from '@/lib/demo-data'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateROAS,
  calculateCODConfirmationRate, calculateCancellationRate, calculateTopProduct,
  calculateWeakProduct, calculateLowStockProducts, calculatePendingFollowups,
  getRevenueByDay, getOrdersByDay, getProductPerformance, getAdSpendByCampaign,
  getROASByCampaign, getCODStatusBreakdown, calculateAdRevenue,
  calculateCODOrders, calculateConfirmedCODOrders, calculateCancelledOrders,
} from '@/lib/calculations'

function buildDemoData() {
  const orders = demoOrders
  const ads = demoAds
  const leads = demoLeads
  const inventory = demoInventory
  const actions = demoActions

  return {
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
    actions: actions.slice(0, 5),
    trial: null,
    isDemo: true,
  }
}

function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const DATE_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 0 },
]

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)

  async function fetchDashboard(from?: string, to?: string) {
    try {
      let url = '/api/dashboard'
      const params: string[] = []
      if (from) params.push(`from=${from}`)
      if (to) params.push(`to=${to}`)
      if (params.length) url += '?' + params.join('&')

      const res = await fetch(url)
      if (res.ok) {
        const apiData = await res.json()
        if (apiData.metrics) {
          setData({ ...apiData, isDemo: false })
          setIsLoggedIn(true)
          setLoading(false)
          return true
        }
      }
    } catch {}
    return false
  }

  async function handleSync(provider: string) {
    setSyncing(provider)
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`${provider} synced: ${result.result?.new || 0} new, ${result.result?.updated || 0} updated`)
        fetchDashboard(dateFrom || undefined, dateTo || undefined)
      } else {
        toast.error(result.error)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setSyncing(null)
  }

  useEffect(() => {
    async function init() {
      const found = await fetchDashboard()
      if (!found) {
        setData(buildDemoData())
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) setData(await res.json())
      } catch {}
    }, 30000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  const m = data.metrics
  const isDemo = data.isDemo
  const trialDays = data.trial ? getTrialDaysRemaining(data.trial.trial_end) : 0
  const trialExpired = data.trial?.status === 'active' && trialDays === 0

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-amber-900">You&apos;re viewing demo data</p>
              <p className="text-xs text-amber-700 mt-0.5">Sign in to save your own business data, upload CSVs, and get weekly reports.</p>
            </div>
            <div className="flex gap-2">
              <LinkButton href="/signup" size="sm">Start Free Trial</LinkButton>
              <LinkButton href="/login" size="sm" variant="outline">Log In</LinkButton>
            </div>
          </div>
        )}

        {/* Trial Banner */}
        {!isDemo && data.trial?.status === 'active' && !trialExpired && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-sm text-blue-800">
              <strong>{trialDays} day{trialDays !== 1 ? 's' : ''}</strong> left in your free trial
            </p>
            <LinkButton href="/billing" size="sm">Upgrade Now</LinkButton>
          </div>
        )}
        {trialExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-sm text-red-800">Your free trial has expired. Upgrade to continue using all features.</p>
            <LinkButton href="/billing" size="sm">Upgrade Now</LinkButton>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {isDemo && <Badge variant="secondary">Demo Mode</Badge>}
        </div>

        {/* Date Range + Sync Controls */}
        {isLoggedIn && (
          <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {DATE_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const from = p.days === 0 ? '' : daysAgoStr(p.days)
                    const to = new Date().toISOString().split('T')[0]
                    setDateFrom(from)
                    setDateTo(to)
                    fetchDashboard(from || undefined, to)
                  }}
                >
                  {p.label}
                </Button>
              ))}
              <div className="flex items-center gap-1 ml-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 text-xs w-[130px]" />
                <span className="text-xs text-gray-400">to</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 text-xs w-[130px]" />
                <Button size="sm" className="h-7 text-xs" onClick={() => fetchDashboard(dateFrom || undefined, dateTo || undefined)}>Apply</Button>
              </div>
            </div>
            {data?.dataMeta?.connections?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <span className="text-xs text-gray-500">Sync:</span>
                {data.dataMeta.connections.map((c: any) => (
                  <Button
                    key={c.provider}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs capitalize"
                    disabled={syncing === c.provider}
                    onClick={() => handleSync(c.provider)}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing === c.provider ? 'animate-spin' : ''}`} />
                    {c.provider}
                    {c.last_sync_at && <span className="text-gray-400 ml-1">({new Date(c.last_sync_at).toLocaleDateString()})</span>}
                  </Button>
                ))}
                <LinkButton href="/history" variant="ghost" size="sm" className="h-7 text-xs ml-auto">View All History</LinkButton>
              </div>
            )}
            {data?.dataMeta && (
              <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                {Object.entries(data.dataMeta.sources.orders || {}).map(([src, count]) => (
                  <span key={src}>{src}: {String(count)} orders</span>
                ))}
                {Object.entries(data.dataMeta.sources.ads || {}).map(([src, count]) => (
                  <span key={src}>{src}: {String(count)} ad rows</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <KPICard title="Revenue" value={formatCurrency(m.revenue)} />
          <KPICard title="Orders" value={formatNumber(m.orders)} />
          <KPICard title="AOV" value={formatCurrency(m.aov)} />
          <KPICard title="Ad Spend" value={formatCurrency(m.adSpend)} />
          <KPICard title="ROAS" value={`${m.roas.toFixed(2)}x`} />
          <KPICard title="COD Confirmation" value={formatPercent(m.codConfirmationRate)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <KPICard title="Cancellation Rate" value={formatPercent(m.cancellationRate)} />
          <KPICard title="Top Product" value={m.topProduct} />
          <KPICard title="Weak Product" value={m.weakProduct} />
          <KPICard title="Low Stock Items" value={formatNumber(m.lowStockCount)} />
          <KPICard title="Pending Follow Ups" value={formatNumber(m.pendingFollowups)} />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={data.charts.revenueByDay} title="Revenue by Day" />
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={data.charts.ordersByDay} title="Orders by Day" color="#16a34a" />
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={data.charts.adSpendByCampaign} title="Ad Spend by Campaign" color="#f59e0b" />
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={data.charts.roasByCampaign} title="ROAS by Campaign" color="#8b5cf6" />
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <SimpleBarChart
              data={data.charts.productPerformance.map((p: any) => ({ label: p.name, value: p.revenue }))}
              title="Top Products by Revenue"
            />
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <SimplePieChart data={data.charts.codStatusBreakdown} title="COD Status Breakdown" />
          </div>
        </div>

        {/* Tables */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Top Products</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.charts.productPerformance.slice(0, 5).map((p: any) => (
                  <TableRow key={p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Low Stock Products</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStockProducts.map((p: any) => (
                  <TableRow key={p.sku || p.product_name}>
                    <TableCell>{p.product_name}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{p.current_stock}</TableCell>
                    <TableCell className="text-right">{p.reorder_level}</TableCell>
                  </TableRow>
                ))}
                {data.lowStockProducts.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-gray-400">No low stock items</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Next 5 Actions</h3>
            {!isDemo && <LinkButton href="/actions" variant="outline" size="sm">View All</LinkButton>}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.actions.map((a: any, i: number) => (
                <TableRow key={a.id || i}>
                  <TableCell>{a.action}</TableCell>
                  <TableCell>{a.category}</TableCell>
                  <TableCell>
                    <Badge variant={a.priority === 'High' ? 'destructive' : a.priority === 'Medium' ? 'secondary' : 'outline'}>
                      {a.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.status}</TableCell>
                </TableRow>
              ))}
              {data.actions.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-400">No pending actions</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Connect your tools CTA */}
        {isDemo && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8 text-center">
            <h2 className="text-lg font-bold text-gray-900">Connect Your Tools</h2>
            <p className="text-sm text-gray-500 mt-1">Link your Shopify, Meta Ads, or GA4 to see real data here.</p>
            <div className="mt-4">
              <LinkButton href="/integrations">Set Up Integrations</LinkButton>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}
