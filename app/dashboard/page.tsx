'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { LinkButton } from '@/components/link-button'
import { formatCurrency, formatNumber, formatPercent, getTrialDaysRemaining } from '@/lib/utils'
import { toast } from 'sonner'
import { RefreshCw, TrendingUp, ShoppingCart, Wallet, Megaphone, Target, PhoneCall, XCircle, Trophy, TrendingDown, PackageSearch, Bell } from 'lucide-react'
import { demoOrders, demoAds, demoLeads, demoInventory, demoActions } from '@/lib/demo-data'
import { DashboardCard, KPIWidget, ProgressSlider } from '@/components/dashboard/widgets'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateROAS,
  calculateCODConfirmationRate, calculateCancellationRate, calculateTopProduct,
  calculateWeakProduct, calculateLowStockProducts, calculatePendingFollowups,
  getRevenueByDay, getOrdersByDay, getProductPerformance, getAdSpendByCampaign,
  getROASByCampaign, getCODStatusBreakdown, calculateAdRevenue,
  calculateCODOrders, calculateConfirmedCODOrders, calculateCancelledOrders,
} from '@/lib/calculations'

// Charts are code-split so recharts stays out of the initial bundle — the
// KPIs and layout paint immediately while the chart chunk loads in parallel.
const chartSkeleton = () => (
  <div className="h-[322px] animate-pulse rounded-3xl border border-[#eeeaf9] bg-white/70" />
)
const BarChartWidget = dynamic(() => import('@/components/dashboard/pastel-charts').then((m) => m.BarChartWidget), { ssr: false, loading: chartSkeleton })
const AreaChartWidget = dynamic(() => import('@/components/dashboard/pastel-charts').then((m) => m.AreaChartWidget), { ssr: false, loading: chartSkeleton })
const DonutChartWidget = dynamic(() => import('@/components/dashboard/pastel-charts').then((m) => m.DonutChartWidget), { ssr: false, loading: chartSkeleton })

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
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DATE_PRESETS: { label: string; fromDays?: number; toDays?: number; all?: boolean }[] = [
  { label: 'Today', fromDays: 0, toDays: 0 },
  { label: 'Yesterday', fromDays: 1, toDays: 1 },
  { label: '7D', fromDays: 7, toDays: 0 },
  { label: '30D', fromDays: 30, toDays: 0 },
  { label: '90D', fromDays: 90, toDays: 0 },
  { label: '6M', fromDays: 180, toDays: 0 },
  { label: '1Y', fromDays: 365, toDays: 0 },
  { label: 'All', all: true },
]

/* ---------- Pastel table styling ---------- */

const thClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8d87b8]'
const tdClass = 'px-3 py-2.5 text-sm text-[#4a4477] border-t border-[#f0ecfb]'

function PriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === 'High'
      ? 'bg-[#ffe4ef] text-[#db2777]'
      : priority === 'Medium'
        ? 'bg-[#f3e8ff] text-[#9333ea]'
        : 'bg-[#eceafd] text-[#6d64b8]'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{priority}</span>
}

/* ---------- Client-side range cache (module scope: survives remounts) ---------- */

const CACHE_TTL_MS = 60_000
const rangeCache = new Map<string, { data: any; ts: number }>()
const inflight = new Map<string, Promise<any | null>>()

function rangeKey(from?: string, to?: string) {
  return `${from || ''}|${to || ''}`
}

// Single fetch per range: dedupes concurrent requests for the same key.
function fetchRange(from?: string, to?: string): Promise<any | null> {
  const key = rangeKey(from, to)
  const existing = inflight.get(key)
  if (existing) return existing

  let url = '/api/dashboard'
  const params: string[] = []
  if (from) params.push(`from=${from}`)
  if (to) params.push(`to=${to}`)
  if (params.length) url += '?' + params.join('&')

  const p = (async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const apiData = await res.json()
      if (!apiData.metrics) return null
      rangeCache.set(key, { data: apiData, ts: Date.now() })
      return apiData
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

/* ---------- Page ---------- */

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [dateFrom, setDateFrom] = useState(daysAgoStr(0))
  const [dateTo, setDateTo] = useState(daysAgoStr(0))
  const [syncing, setSyncing] = useState<string | null>(null)
  const fetchSeq = useRef(0)

  async function fetchDashboard(from?: string, to?: string) {
    const seq = ++fetchSeq.current
    const apiData = await fetchRange(from, to)
    // Ignore responses that arrive after a newer request (fast date switching)
    if (seq !== fetchSeq.current) return true
    if (apiData) {
      setData({ ...apiData, isDemo: false })
      setIsLoggedIn(true)
      setLoading(false)
      return true
    }
    return false
  }

  async function switchRange(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)

    // Serve from cache instantly, then revalidate in the background
    const cached = rangeCache.get(rangeKey(from || undefined, to || undefined))
    const fresh = cached && Date.now() - cached.ts < CACHE_TTL_MS
    if (cached) {
      fetchSeq.current++ // invalidate any in-flight older request
      setData({ ...cached.data, isDemo: false })
    }
    if (fresh) return

    if (!cached) setRefreshing(true)
    await fetchDashboard(from || undefined, to || undefined)
    setRefreshing(false)
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
        rangeCache.clear() // synced data invalidates every cached range
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
      const found = await fetchDashboard(dateFrom, dateTo)
      if (!found) {
        setData(buildDemoData())
        setLoading(false)
      } else {
        // Warm the cache for the common presets so switching is instant
        const idle = () => {
          for (const p of DATE_PRESETS.slice(0, 5)) {
            const from = p.all ? undefined : daysAgoStr(p.fromDays || 0)
            const to = p.all ? undefined : daysAgoStr(p.toDays || 0)
            if (!rangeCache.has(rangeKey(from, to))) fetchRange(from, to)
          }
        }
        if ('requestIdleCallback' in window) (window as any).requestIdleCallback(idle, { timeout: 3000 })
        else setTimeout(idle, 1500)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(() => {
      // Skip background polling when the tab is hidden to cut server load
      if (document.hidden) return
      fetchDashboard(dateFrom || undefined, dateTo || undefined)
    }, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, dateFrom, dateTo])

  // Stable identity for the mapped chart array so the memoized chart skips re-render
  const topProductsChart = useMemo(
    () => (data?.charts?.productPerformance || []).map((p: any) => ({ label: p.name, value: p.revenue })),
    [data?.charts?.productPerformance]
  )

  // Mini sparkline series for the KPI cards (derived from the same chart data)
  const revenueSpark = useMemo(
    () => (data?.charts?.revenueByDay || []).map((d: any) => Number(d.value) || 0),
    [data?.charts?.revenueByDay]
  )
  const ordersSpark = useMemo(
    () => (data?.charts?.ordersByDay || []).map((d: any) => Number(d.value) || 0),
    [data?.charts?.ordersByDay]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3fb]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded-full bg-[#e8e3f8]" />
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl border border-[#eeeaf9] bg-white/70" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-3xl border border-[#eeeaf9] bg-white/70" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const m = data.metrics
  const isDemo = data.isDemo
  const trialDays = data.trial ? getTrialDaysRemaining(data.trial.trial_end) : 0
  const trialExpired = data.trial?.status === 'active' && trialDays === 0

  return (
    <div className="min-h-screen bg-[#f5f3fb] text-[#312b63]">
      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* Demo Banner */}
        {isDemo && (
          <DashboardCard tone="pink" className="mb-6 flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-[#db2777]">You&apos;re viewing demo data</p>
              <p className="mt-0.5 text-xs text-[#8d87b8]">Sign in to save your own business data, upload CSVs, and get weekly reports.</p>
            </div>
            <div className="flex gap-2">
              <LinkButton href="/signup" size="sm" className="rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] hover:opacity-90">Start Free Trial</LinkButton>
              <LinkButton href="/login" size="sm" variant="outline" className="rounded-full border-[#e4defa] bg-white text-[#6d64b8] hover:bg-[#f4f0fd] hover:text-[#312b63]">Log In</LinkButton>
            </div>
          </DashboardCard>
        )}

        {/* Trial Banner */}
        {!isDemo && data.trial?.status === 'active' && !trialExpired && (
          <DashboardCard tone="lilac" className="mb-6 flex flex-col items-start justify-between gap-2 p-5 sm:flex-row sm:items-center">
            <p className="text-sm text-[#6d64b8]">
              <strong className="text-[#8b5cf6]">{trialDays} day{trialDays !== 1 ? 's' : ''}</strong> left in your free trial
            </p>
            <LinkButton href="/billing" size="sm" className="rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] hover:opacity-90">Upgrade Now</LinkButton>
          </DashboardCard>
        )}
        {trialExpired && (
          <DashboardCard tone="pink" className="mb-6 flex flex-col items-start justify-between gap-2 p-5 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-[#db2777]">Your free trial has expired. Upgrade to continue using all features.</p>
            <LinkButton href="/billing" size="sm" className="rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] hover:opacity-90">Upgrade Now</LinkButton>
          </DashboardCard>
        )}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#312b63]">Dashboard</h1>
            <p className="mt-0.5 text-sm text-[#8d87b8]">Your business at a glance</p>
          </div>
          <div className="flex items-center gap-2">
            {refreshing && <RefreshCw className="h-4 w-4 animate-spin text-[#ec4899]" />}
            {isDemo && (
              <span className="inline-flex items-center rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-semibold text-[#9333ea]">Demo Mode</span>
            )}
          </div>
        </div>

        {/* Date Range + Sync Controls */}
        {isLoggedIn && (
          <DashboardCard className="mb-6 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 rounded-full bg-[#f4f0fd] p-1">
                {DATE_PRESETS.map((p) => {
                  const from = p.all ? '' : daysAgoStr(p.fromDays || 0)
                  const to = p.all ? '' : daysAgoStr(p.toDays || 0)
                  const active = dateFrom === from && dateTo === to
                  return (
                    <button
                      key={p.label}
                      onClick={() => switchRange(from, to)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-gradient-to-r from-[#ec4899] to-[#d946ef] text-white shadow-[0_4px_14px_rgba(236,72,153,0.4)]'
                          : 'text-[#6d64b8] hover:bg-white hover:text-[#312b63]'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-full border border-[#e4defa] bg-white px-3 text-xs text-[#4a4477] outline-none [color-scheme:light] focus:border-[#ec4899]/60 sm:w-[135px] sm:flex-none"
                />
                <span className="hidden text-xs text-[#8d87b8] sm:inline">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-full border border-[#e4defa] bg-white px-3 text-xs text-[#4a4477] outline-none [color-scheme:light] focus:border-[#ec4899]/60 sm:w-[135px] sm:flex-none"
                />
                <button
                  onClick={() => switchRange(dateFrom, dateTo)}
                  className="h-8 w-full rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] px-4 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] transition-opacity hover:opacity-90 sm:w-auto"
                >
                  Apply
                </button>
              </div>
            </div>
            {data?.dataMeta?.connections?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#f0ecfb] pt-3">
                <span className="text-xs text-[#8d87b8]">Sync:</span>
                {data.dataMeta.connections.map((c: any) => (
                  <button
                    key={c.provider}
                    disabled={syncing === c.provider}
                    onClick={() => handleSync(c.provider)}
                    className="inline-flex h-7 items-center rounded-full border border-[#e4defa] bg-white px-3 text-xs capitalize text-[#6d64b8] transition-colors hover:border-[#ec4899]/50 hover:text-[#312b63] disabled:opacity-50"
                  >
                    <RefreshCw className={`mr-1.5 h-3 w-3 ${syncing === c.provider ? 'animate-spin text-[#ec4899]' : 'text-[#a79fd6]'}`} />
                    {c.provider}
                    {c.last_sync_at && <span className="ml-1.5 text-[#a79fd6]">({new Date(c.last_sync_at).toLocaleDateString()})</span>}
                  </button>
                ))}
                <LinkButton href="/history" variant="ghost" size="sm" className="ml-auto h-7 rounded-full text-xs text-[#6d64b8] hover:bg-[#f4f0fd] hover:text-[#312b63]">View All History</LinkButton>
              </div>
            )}
            {data?.dataMeta && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#a79fd6]">
                {Object.entries(data.dataMeta.sources.orders || {}).map(([src, count]) => (
                  <span key={src}>{src}: {String(count)} orders</span>
                ))}
                {Object.entries(data.dataMeta.sources.ads || {}).map(([src, count]) => (
                  <span key={src}>{src}: {String(count)} ad rows</span>
                ))}
              </div>
            )}
          </DashboardCard>
        )}

        {/* KPIs */}
        <div className={`transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KPIWidget title="Revenue" value={formatCurrency(m.revenue)} accent="violet" icon={TrendingUp} spark={revenueSpark} />
            <KPIWidget title="Orders" value={formatNumber(m.orders)} icon={ShoppingCart} spark={ordersSpark} sparkVariant="bars" />
            <KPIWidget title="AOV" value={formatCurrency(m.aov)} icon={Wallet} />
            <KPIWidget title="Ad Spend" value={formatCurrency(m.adSpend)} icon={Megaphone} />
            <KPIWidget title="ROAS" value={`${m.roas.toFixed(2)}x`} accent="pink" icon={Target} />
            <KPIWidget title="COD Confirmation" value={formatPercent(m.codConfirmationRate)} ring={m.codConfirmationRate} icon={PhoneCall} />
          </div>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <KPIWidget title="Cancellation Rate" value={formatPercent(m.cancellationRate)} ring={m.cancellationRate} icon={XCircle} />
            <KPIWidget title="Top Product" value={m.topProduct} icon={Trophy} />
            <KPIWidget title="Weak Product" value={m.weakProduct} icon={TrendingDown} />
            <KPIWidget title="Low Stock Items" value={formatNumber(m.lowStockCount)} icon={PackageSearch} dot={m.lowStockCount > 0} />
            <KPIWidget title="Pending Follow Ups" value={formatNumber(m.pendingFollowups)} icon={Bell} dot={m.pendingFollowups > 0} />
          </div>

          {/* Charts */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <AreaChartWidget data={data.charts.revenueByDay} title="Revenue by Day" />
            <BarChartWidget data={data.charts.ordersByDay} title="Orders by Day" from="#ec4899" to="#f0abfc" />
            <BarChartWidget data={data.charts.adSpendByCampaign} title="Ad Spend by Campaign" from="#8b5cf6" to="#c4b5fd" />
            <BarChartWidget data={data.charts.roasByCampaign} title="ROAS by Campaign" from="#d946ef" to="#f0abfc" />
            <BarChartWidget data={topProductsChart} title="Top Products by Revenue" from="#6d64b8" to="#a78bfa" />
            <DonutChartWidget data={data.charts.codStatusBreakdown} title="COD Status Breakdown" centerLabel="Orders" />
          </div>

          {/* Tables */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <DashboardCard className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#312b63]">Top Products</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thClass}>Product</th>
                      <th className={`${thClass} text-right`}>Revenue</th>
                      <th className={`${thClass} text-right`}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.productPerformance.slice(0, 5).map((p: any) => (
                      <tr key={p.name} className="transition-colors hover:bg-[#f8f6fd]">
                        <td className={tdClass}>{p.name}</td>
                        <td className={`${tdClass} text-right font-semibold text-[#312b63]`}>{formatCurrency(p.revenue)}</td>
                        <td className={`${tdClass} text-right`}>{p.quantity}</td>
                      </tr>
                    ))}
                    {data.charts.productPerformance.length === 0 && (
                      <tr><td colSpan={3} className={`${tdClass} text-center text-[#a79fd6]`}>No product data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            <DashboardCard className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#312b63]">Low Stock Products</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thClass}>Product</th>
                      <th className={`${thClass} text-right`}>Stock</th>
                      <th className={`${thClass} w-[38%]`}>Level vs Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStockProducts.map((p: any) => {
                      const reorder = Number(p.reorder_level) || 0
                      const pct = reorder > 0 ? Math.min(100, (Number(p.current_stock) / reorder) * 100) : 0
                      return (
                        <tr key={p.sku || p.product_name} className="transition-colors hover:bg-[#f8f6fd]">
                          <td className={tdClass}>{p.product_name}</td>
                          <td className={`${tdClass} text-right font-bold text-[#db2777]`}>{p.current_stock}</td>
                          <td className={tdClass}>
                            <div className="flex items-center gap-2">
                              <ProgressSlider value={pct} from="#ec4899" to="#db2777" className="min-w-[70px]" />
                              <span className="whitespace-nowrap text-xs text-[#8d87b8]">of {p.reorder_level}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {data.lowStockProducts.length === 0 && (
                      <tr><td colSpan={3} className={`${tdClass} text-center text-[#a79fd6]`}>No low stock items</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>

          {/* Actions */}
          <DashboardCard className="mb-8 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#312b63]">Next 5 Actions</h3>
              {!isDemo && <LinkButton href="/actions" variant="outline" size="sm" className="rounded-full border-[#e4defa] bg-white text-[#6d64b8] hover:bg-[#f4f0fd] hover:text-[#312b63]">View All</LinkButton>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thClass}>Action</th>
                    <th className={thClass}>Category</th>
                    <th className={thClass}>Priority</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.actions.map((a: any, i: number) => (
                    <tr key={a.id || i} className="transition-colors hover:bg-[#f8f6fd]">
                      <td className={tdClass}>{a.action}</td>
                      <td className={tdClass}>{a.category}</td>
                      <td className={tdClass}><PriorityBadge priority={a.priority} /></td>
                      <td className={tdClass}>{a.status}</td>
                    </tr>
                  ))}
                  {data.actions.length === 0 && (
                    <tr><td colSpan={4} className={`${tdClass} text-center text-[#a79fd6]`}>No pending actions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>

        {/* Connect your tools CTA */}
        {isDemo && (
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#7c5cf1] via-[#a855f7] to-[#ec4899] p-6 text-center text-white shadow-[0_12px_40px_rgba(139,92,246,0.35)]">
            <h2 className="text-lg font-bold">Connect Your Tools</h2>
            <p className="mt-1 text-sm text-white/80">Link your Shopify, Meta Ads, or GA4 to see real data here.</p>
            <div className="mt-4">
              <LinkButton href="/integrations" className="rounded-full bg-white text-[#7c3aed] hover:bg-white/90">Set Up Integrations</LinkButton>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#a79fd6]">Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}
