'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { LinkButton } from '@/components/link-button'
import { formatCurrency, formatNumber, formatPercent, getTrialDaysRemaining } from '@/lib/utils'
import { toast } from 'sonner'
import { RefreshCw, TrendingUp, ShoppingCart, Wallet, Megaphone, Target, PhoneCall, XCircle, Trophy, TrendingDown, PackageSearch, Bell } from 'lucide-react'
import { demoOrders, demoAds, demoLeads, demoInventory, demoActions } from '@/lib/demo-data'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateROAS,
  calculateCODConfirmationRate, calculateCancellationRate, calculateTopProduct,
  calculateWeakProduct, calculateLowStockProducts, calculatePendingFollowups,
  getRevenueByDay, getOrdersByDay, getProductPerformance, getAdSpendByCampaign,
  getROASByCampaign, getCODStatusBreakdown, calculateAdRevenue,
  calculateCODOrders, calculateConfirmedCODOrders, calculateCancelledOrders,
} from '@/lib/calculations'

const AMBER = '#f59e0b'
const PIE_COLORS = ['#f59e0b', '#fbbf24', '#78716c', '#d97706', '#a8a29e']

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

/* ---------- Dark UI primitives (scoped to this page) ---------- */

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.08] bg-zinc-900/70 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, accent = false }: { title: string; value: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <Panel className="p-4 transition-colors hover:border-amber-500/30">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</p>
        <Icon className={`h-4 w-4 ${accent ? 'text-amber-500' : 'text-zinc-600'}`} />
      </div>
      <p className={`mt-2 truncate text-xl font-semibold sm:text-2xl ${accent ? 'text-amber-400' : 'text-white'}`} title={value}>{value}</p>
    </Panel>
  )
}

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 12,
}

function DarkBarChart({ data, title, color = AMBER }: { data: any[]; title: string; color?: string }) {
  return (
    <Panel className="p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-300">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
}

function DarkPieChart({ data, title }: { data: any[]; title: string }) {
  return (
    <Panel className="p-5">
      <h3 className="mb-4 text-sm font-medium text-zinc-300">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2} dataKey="value" nameKey="label" stroke="none" label={{ fill: '#a1a1aa', fontSize: 11 }}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
        </PieChart>
      </ResponsiveContainer>
    </Panel>
  )
}

const thClass = 'px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500'
const tdClass = 'px-3 py-2.5 text-sm text-zinc-300 border-t border-white/[0.06]'

function PriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === 'High'
      ? 'bg-red-500/10 text-red-400 border-red-500/20'
      : priority === 'Medium'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>{priority}</span>
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
    try {
      let url = '/api/dashboard'
      const params: string[] = []
      if (from) params.push(`from=${from}`)
      if (to) params.push(`to=${to}`)
      if (params.length) url += '?' + params.join('&')

      const res = await fetch(url)
      if (res.ok) {
        const apiData = await res.json()
        // Ignore responses that arrive after a newer request (fast date switching)
        if (seq !== fetchSeq.current) return true
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

  async function switchRange(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
    setRefreshing(true)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-zinc-800/60" />
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-zinc-900/60" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl border border-white/[0.06] bg-zinc-900/60" />
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* Demo Banner */}
        {isDemo && (
          <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-amber-300">You&apos;re viewing demo data</p>
              <p className="mt-0.5 text-xs text-amber-200/60">Sign in to save your own business data, upload CSVs, and get weekly reports.</p>
            </div>
            <div className="flex gap-2">
              <LinkButton href="/signup" size="sm" className="bg-amber-500 text-black hover:bg-amber-400">Start Free Trial</LinkButton>
              <LinkButton href="/login" size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">Log In</LinkButton>
            </div>
          </div>
        )}

        {/* Trial Banner */}
        {!isDemo && data.trial?.status === 'active' && !trialExpired && (
          <div className="mb-6 flex flex-col items-start justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-amber-200">
              <strong className="text-amber-300">{trialDays} day{trialDays !== 1 ? 's' : ''}</strong> left in your free trial
            </p>
            <LinkButton href="/billing" size="sm" className="bg-amber-500 text-black hover:bg-amber-400">Upgrade Now</LinkButton>
          </div>
        )}
        {trialExpired && (
          <div className="mb-6 flex flex-col items-start justify-between gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-red-300">Your free trial has expired. Upgrade to continue using all features.</p>
            <LinkButton href="/billing" size="sm" className="bg-amber-500 text-black hover:bg-amber-400">Upgrade Now</LinkButton>
          </div>
        )}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Your business at a glance</p>
          </div>
          <div className="flex items-center gap-2">
            {refreshing && <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />}
            {isDemo && (
              <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">Demo Mode</span>
            )}
          </div>
        </div>

        {/* Date Range + Sync Controls */}
        {isLoggedIn && (
          <Panel className="mb-6 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.08] bg-zinc-950/60 p-1">
                {DATE_PRESETS.map((p) => {
                  const from = p.all ? '' : daysAgoStr(p.fromDays || 0)
                  const to = p.all ? '' : daysAgoStr(p.toDays || 0)
                  const active = dateFrom === from && dateTo === to
                  return (
                    <button
                      key={p.label}
                      onClick={() => switchRange(from, to)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                          : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-[135px] rounded-md border border-white/[0.1] bg-zinc-950/60 px-2 text-xs text-zinc-300 outline-none [color-scheme:dark] focus:border-amber-500/50"
                />
                <span className="text-xs text-zinc-600">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-[135px] rounded-md border border-white/[0.1] bg-zinc-950/60 px-2 text-xs text-zinc-300 outline-none [color-scheme:dark] focus:border-amber-500/50"
                />
                <button
                  onClick={() => switchRange(dateFrom, dateTo)}
                  className="h-8 rounded-md bg-amber-500 px-3 text-xs font-medium text-black transition-colors hover:bg-amber-400"
                >
                  Apply
                </button>
              </div>
            </div>
            {data?.dataMeta?.connections?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                <span className="text-xs text-zinc-500">Sync:</span>
                {data.dataMeta.connections.map((c: any) => (
                  <button
                    key={c.provider}
                    disabled={syncing === c.provider}
                    onClick={() => handleSync(c.provider)}
                    className="inline-flex h-7 items-center rounded-md border border-white/[0.1] bg-zinc-950/60 px-2.5 text-xs capitalize text-zinc-300 transition-colors hover:border-amber-500/40 hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`mr-1.5 h-3 w-3 ${syncing === c.provider ? 'animate-spin text-amber-500' : 'text-zinc-500'}`} />
                    {c.provider}
                    {c.last_sync_at && <span className="ml-1.5 text-zinc-600">({new Date(c.last_sync_at).toLocaleDateString()})</span>}
                  </button>
                ))}
                <LinkButton href="/history" variant="ghost" size="sm" className="ml-auto h-7 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white">View All History</LinkButton>
              </div>
            )}
            {data?.dataMeta && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-600">
                {Object.entries(data.dataMeta.sources.orders || {}).map(([src, count]) => (
                  <span key={src}>{src}: {String(count)} orders</span>
                ))}
                {Object.entries(data.dataMeta.sources.ads || {}).map(([src, count]) => (
                  <span key={src}>{src}: {String(count)} ad rows</span>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* KPIs */}
        <div className={`transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard title="Revenue" value={formatCurrency(m.revenue)} icon={TrendingUp} accent />
            <StatCard title="Orders" value={formatNumber(m.orders)} icon={ShoppingCart} />
            <StatCard title="AOV" value={formatCurrency(m.aov)} icon={Wallet} />
            <StatCard title="Ad Spend" value={formatCurrency(m.adSpend)} icon={Megaphone} />
            <StatCard title="ROAS" value={`${m.roas.toFixed(2)}x`} icon={Target} accent />
            <StatCard title="COD Confirmation" value={formatPercent(m.codConfirmationRate)} icon={PhoneCall} />
          </div>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard title="Cancellation Rate" value={formatPercent(m.cancellationRate)} icon={XCircle} />
            <StatCard title="Top Product" value={m.topProduct} icon={Trophy} />
            <StatCard title="Weak Product" value={m.weakProduct} icon={TrendingDown} />
            <StatCard title="Low Stock Items" value={formatNumber(m.lowStockCount)} icon={PackageSearch} />
            <StatCard title="Pending Follow Ups" value={formatNumber(m.pendingFollowups)} icon={Bell} />
          </div>

          {/* Charts */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <DarkBarChart data={data.charts.revenueByDay} title="Revenue by Day" />
            <DarkBarChart data={data.charts.ordersByDay} title="Orders by Day" color="#fbbf24" />
            <DarkBarChart data={data.charts.adSpendByCampaign} title="Ad Spend by Campaign" color="#d97706" />
            <DarkBarChart data={data.charts.roasByCampaign} title="ROAS by Campaign" color="#f59e0b" />
            <DarkBarChart
              data={data.charts.productPerformance.map((p: any) => ({ label: p.name, value: p.revenue }))}
              title="Top Products by Revenue"
            />
            <DarkPieChart data={data.charts.codStatusBreakdown} title="COD Status Breakdown" />
          </div>

          {/* Tables */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <Panel className="p-5">
              <h3 className="mb-3 text-sm font-medium text-zinc-300">Top Products</h3>
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
                      <tr key={p.name} className="transition-colors hover:bg-white/[0.03]">
                        <td className={tdClass}>{p.name}</td>
                        <td className={`${tdClass} text-right font-medium text-white`}>{formatCurrency(p.revenue)}</td>
                        <td className={`${tdClass} text-right`}>{p.quantity}</td>
                      </tr>
                    ))}
                    {data.charts.productPerformance.length === 0 && (
                      <tr><td colSpan={3} className={`${tdClass} text-center text-zinc-600`}>No product data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel className="p-5">
              <h3 className="mb-3 text-sm font-medium text-zinc-300">Low Stock Products</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thClass}>Product</th>
                      <th className={`${thClass} text-right`}>Stock</th>
                      <th className={`${thClass} text-right`}>Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStockProducts.map((p: any) => (
                      <tr key={p.sku || p.product_name} className="transition-colors hover:bg-white/[0.03]">
                        <td className={tdClass}>{p.product_name}</td>
                        <td className={`${tdClass} text-right font-semibold text-red-400`}>{p.current_stock}</td>
                        <td className={`${tdClass} text-right`}>{p.reorder_level}</td>
                      </tr>
                    ))}
                    {data.lowStockProducts.length === 0 && (
                      <tr><td colSpan={3} className={`${tdClass} text-center text-zinc-600`}>No low stock items</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* Actions */}
          <Panel className="mb-8 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Next 5 Actions</h3>
              {!isDemo && <LinkButton href="/actions" variant="outline" size="sm" className="border-white/15 bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white">View All</LinkButton>}
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
                    <tr key={a.id || i} className="transition-colors hover:bg-white/[0.03]">
                      <td className={tdClass}>{a.action}</td>
                      <td className={tdClass}>{a.category}</td>
                      <td className={tdClass}><PriorityBadge priority={a.priority} /></td>
                      <td className={tdClass}>{a.status}</td>
                    </tr>
                  ))}
                  {data.actions.length === 0 && (
                    <tr><td colSpan={4} className={`${tdClass} text-center text-zinc-600`}>No pending actions</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Connect your tools CTA */}
        {isDemo && (
          <Panel className="mb-8 p-6 text-center">
            <h2 className="text-lg font-bold text-white">Connect Your Tools</h2>
            <p className="mt-1 text-sm text-zinc-500">Link your Shopify, Meta Ads, or GA4 to see real data here.</p>
            <div className="mt-4">
              <LinkButton href="/integrations" className="bg-amber-500 text-black hover:bg-amber-400">Set Up Integrations</LinkButton>
            </div>
          </Panel>
        )}

        <p className="text-center text-xs text-zinc-600">Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  )
}
