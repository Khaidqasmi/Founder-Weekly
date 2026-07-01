'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SimpleBarChart } from '@/components/charts/bar-chart'
import { LoadingSpinner } from '@/components/loading'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { demoAnalytics } from '@/lib/integrations/shopify/demo-analytics'
import type { ShopifyAnalytics } from '@/lib/integrations/shopify/analytics'
import { ArrowRight, Smartphone, Monitor, Tablet, RefreshCw, ShoppingBag, BarChart3, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

function DeviceIcon({ device }: { device: string }) {
  const d = device.toLowerCase()
  if (d.includes('mobile') || d.includes('phone')) return <Smartphone className="w-4 h-4 text-blue-500" />
  if (d.includes('desktop') || d.includes('computer')) return <Monitor className="w-4 h-4 text-green-500" />
  return <Tablet className="w-4 h-4 text-purple-500" />
}

function HorizontalFunnel({ steps }: { steps: { step: string; count: number; rate: number }[] }) {
  const max = steps[0]?.count || 1
  const colors = ['#f59e0b', '#fbbf24', '#d97706', '#a8a29e', '#78716c']
  return (
    <div className="flex items-stretch gap-0 w-full">
      {steps.map((s, i) => {
        const heightPct = Math.max((s.count / max) * 100, 20)
        const isLast = i === steps.length - 1
        return (
          <div key={s.step} className="flex items-end flex-1 min-w-0">
            <div className="flex flex-col items-center w-full">
              <p className="text-base font-bold text-white dark:text-gray-100">{formatNumber(s.count)}</p>
              <p className="text-xs text-zinc-500 mb-2">{s.rate}%</p>
              <div className="w-full rounded-t-md transition-all" style={{ height: `${heightPct}px`, minHeight: 28, backgroundColor: colors[i] || colors[4] }} />
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mt-2 text-center leading-tight">{s.step}</p>
            </div>
            {!isLast && <div className="flex items-center px-1 self-center mb-6"><ArrowRight className="w-3 h-3 text-gray-300 shrink-0" /></div>}
          </div>
        )
      })}
    </div>
  )
}

function LandingPageChange({ change }: { change?: number | null }) {
  if (change === null || change === undefined) {
    return <span className="text-sm font-semibold text-zinc-500">-</span>
  }

  if (change >= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
        <TrendingUp className="w-3.5 h-3.5" />
        {formatNumber(change)}%
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-400">
      <TrendingDown className="w-3.5 h-3.5" />
      {formatNumber(Math.abs(change))}%
    </span>
  )
}

// ─── Shopify Analytics Tab ───────────────────────────────────────────────────

function ShopifyTab() {
  const [data, setData] = useState<ShopifyAnalytics>(demoAnalytics)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(true)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [connected, setConnected] = useState<boolean | null>(null)
  const [shopDomain, setShopDomain] = useState('')
  const [dateFrom, setDateFrom] = useState(daysAgoStr(30))
  const [dateTo, setDateTo] = useState(daysAgoStr(0))
  const [dataSource, setDataSource] = useState<'shopifyql' | 'estimated' | 'demo'>('demo')
  const fetchSeqRef = useRef(0)

  async function fetchData(from: string, to: string) {
    const seq = ++fetchSeqRef.current
    const isStale = () => seq !== fetchSeqRef.current
    setLoading(true)
    setError('')
    setWarning('')
    try {
      const res = await fetch(`/api/analytics?from=${from}&to=${to}`)
      if (res.status === 401) {
        setConnected(false)
        setIsDemo(true)
        setLoading(false)
        return
      }
      if (res.status === 400 || res.status === 404) {
        const e = await res.json()
        setConnected(false)
        setIsDemo(true)
        // Surface non-connection errors (e.g. missing read_analytics scope) as a warning
        if (e.error && e.error !== 'Shopify not connected' && e.error !== 'No workspace') {
          setError(e.error)
        }
        setLoading(false)
        return
      }
      if (!res.ok) {
        const e = await res.json()
        setError(e.error || 'Failed to fetch analytics')
        setLoading(false)
        return
      }
      const d: ShopifyAnalytics = await res.json()
      if (isStale()) return
      setData(d)
      setConnected(true)
      setIsDemo(false)
      setDataSource((d as any).dataSource || 'estimated')
      if ((d as any).shopDomain) setShopDomain((d as any).shopDomain)
      if (d.syncedOrderFallback) {
        setWarning(
          d.analyticsAccessLimited
            ? 'Showing sales, orders, AOV, products, and funnel metrics from synced Shopify orders. Live Shopify traffic metrics such as sessions and bounce rate are not available from the connected app yet.'
            : 'Showing sales, orders, AOV, products, and funnel metrics from your synced Shopify orders.'
        )
      } else if (d.orderAccessLimited) {
        setWarning(
          `Shopify shows ${d.orderCount} order(s) in this date range, but your connected app can only retrieve order details from the last 60 days. ` +
          `Sales and revenue figures are hidden to avoid showing inaccurate zeros. ` +
          `To unlock the full date range: add the read_all_orders scope to your Shopify app and reconnect the integration.`
        )
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData(dateFrom, dateTo) }, [])

  return (
    <div>
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          {connected === true ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 border border-green-500/25 text-green-400 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Connected{shopDomain ? ` · ${shopDomain}` : ''}
              </span>
              {dataSource === 'shopifyql' && (
                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/25 rounded-full px-2 py-0.5">Live ShopifyQL data</span>
              )}
              {dataSource === 'estimated' && (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5">Estimated from orders</span>
              )}
            </>
          ) : connected === false ? (
            <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 text-zinc-400 rounded-full px-3 py-1">
              Not connected — <a href="/integrations" className="underline font-medium">connect Shopify</a>
            </span>
          ) : null}
          {isDemo && connected !== null && <Badge variant="secondary" className="text-xs">Demo Data</Badge>}
        </div>

        {connected === true && (
          <button
            onClick={() => fetchData(dateFrom, dateTo)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/15 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Date filter */}
      <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { const f = p.days === 0 ? dateTo : daysAgoStr(p.days); setDateFrom(f); fetchData(f, dateTo) }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                dateFrom === (p.days === 0 ? dateTo : daysAgoStr(p.days))
                  ? 'bg-amber-500 text-black border-amber-500 font-semibold'
                  : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/20'
              }`}
            >{p.label}</button>
          ))}
          <div className="flex items-center gap-1 ml-auto">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 text-xs w-[130px]" />
            <span className="text-xs text-zinc-500">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 text-xs w-[130px]" />
            <button onClick={() => { fetchData(dateFrom, dateTo) }} className="h-7 px-3 text-xs bg-amber-500 text-black font-medium rounded-md hover:bg-amber-400 transition-colors">Apply</button>
          </div>
        </div>
      </div>

      {warning && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-lg p-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>{warning}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-300 rounded-lg p-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          {/* KPI row 1 — Traffic */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Traffic</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <KPICard title="Sessions" value={formatNumber(data.sessions)} />
              <KPICard title="Visitors" value={formatNumber(data.visitors)} />
              <KPICard title="Page Views" value={formatNumber((data as any).pageViews || 0)} />
              <KPICard title="Bounce Rate" value={`${(data as any).bounceRate ?? 0}%`} />
            </div>
          </div>

          {/* KPI row 2 — Sales */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sales</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard title="Total Orders" value={formatNumber(data.purchaseSessions)} />
              <KPICard title="Total Revenue" value={formatCurrency(data.totalSales)} />
              <KPICard title="Avg Order Value" value={formatCurrency(data.averageOrderValue)} />
              <KPICard title="Conversion Rate" value={`${data.conversionRate}%`} />
            </div>
          </div>

          {/* Sessions chart + Funnel */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
              <SimpleBarChart
                data={data.sessionsByDay.map((d) => ({ label: d.date.slice(5), value: d.sessions }))}
                title="Sessions by Day"
              />
            </div>
            <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
              <p className="text-sm font-semibold text-zinc-300 dark:text-gray-300 mb-5">Conversion Funnel</p>
              <HorizontalFunnel steps={data.conversionFunnel} />
            </div>
          </div>

          {/* Traffic Sources + Devices */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
              <p className="text-sm font-semibold text-zinc-300 dark:text-gray-300 mb-4">Traffic Sources</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topReferrers.map((r) => (
                    <TableRow key={r.source}>
                      <TableCell className="text-sm font-medium">{r.source || 'Direct'}</TableCell>
                      <TableCell className="text-right text-sm">{formatNumber(r.sessions)}</TableCell>
                      <TableCell className="text-right text-sm">{r.orders}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(r.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
              <p className="text-sm font-semibold text-zinc-300 dark:text-gray-300 mb-4">Device Breakdown</p>
              <div className="space-y-3">
                {data.deviceBreakdown.map((d) => (
                  <div key={d.device} className="flex items-center gap-3">
                    <DeviceIcon device={d.device} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-zinc-100 dark:text-gray-200">{d.device}</span>
                        <span className="text-zinc-400">{formatNumber(d.sessions)} · {d.percentage}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Landing Pages */}
          <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5 mb-6">
            <p className="text-sm font-semibold text-zinc-300 dark:text-gray-300 mb-4">Sessions by landing page</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.topPages.length > 0 ? data.topPages.slice(0, 8).map((page) => (
                <div key={page.path} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 dark:text-gray-200 truncate">
                      {page.title} · {page.path}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-white dark:text-gray-100">{formatNumber(page.sessions)}</p>
                  <LandingPageChange change={page.changePercent} />
                </div>
              )) : (
                <div className="py-8 text-center text-sm text-zinc-500">No landing page data yet</div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5 mb-6">
            <p className="text-sm font-semibold text-zinc-300 dark:text-gray-300 mb-4">Product Performance</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Added to Cart</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Conv %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.map((p) => (
                  <TableRow key={p.title}>
                    <TableCell className="font-medium text-sm">{p.title}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(p.views)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(p.addedToCart)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(p.purchases)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.views > 0 && (p.purchases / p.views) * 100 > 2 ? 'default' : 'secondary'} className="text-xs">
                        {p.views > 0 ? formatPercent((p.purchases / p.views) * 100) : '0%'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Countries */}
          {data.countryBreakdown.length > 0 && (
            <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
              <p className="text-sm font-semibold text-zinc-300 dark:text-gray-300 mb-4">Top Countries</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.countryBreakdown.map((c) => (
                    <TableRow key={c.country}>
                      <TableCell className="text-sm">{c.country}</TableCell>
                      <TableCell className="text-right text-sm">{formatNumber(c.sessions)}</TableCell>
                      <TableCell className="text-right text-sm">{c.orders}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Connect CTA */}
          {connected === false && (
            <div className="mt-6 bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 p-8 text-center">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white dark:text-gray-100">Connect your Shopify store</h3>
              <p className="text-sm text-zinc-400 mt-1 mb-4">Get real sessions, bounce rate, conversion rate, traffic sources, and product performance — pulled directly from Shopify.</p>
              <a href="/integrations" className="inline-flex items-center gap-2 bg-[#5e8e3e] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#4a7230] transition-colors">
                <ShoppingBag className="w-4 h-4" /> Connect Shopify
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Google Analytics Tab ────────────────────────────────────────────────────

function GoogleAnalyticsTab() {
  const propertyId = typeof window !== 'undefined' ? localStorage.getItem('fwgr_ga4_property_id') || '' : ''
  const connected = !!propertyId

  return (
    <div>
      {connected ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 border border-green-500/25 text-green-400 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Connected · Property {propertyId}
            </span>
          </div>

          <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 p-8 text-center">
            <BarChart3 className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white dark:text-gray-100">Google Analytics 4 Connected</h3>
            <p className="text-sm text-zinc-400 mt-1">
              GA4 data sync runs via server-side service account. Sessions, events, and audience data will appear here once synced.
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              GA4 data includes: real sessions, page views, user demographics, top pages, events, and goal completions — all separate from your Shopify store data.
            </p>
          </div>

          {/* What GA4 provides */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Real Session Tracking', desc: 'GA4 tracks every session including those that don\'t result in an order — giving you true traffic numbers.' },
              { title: 'Event Tracking', desc: 'Button clicks, scroll depth, video plays, form submissions — granular event data Shopify doesn\'t capture.' },
              { title: 'Audience Segments', desc: 'Age, gender, interests, and behavioral segments to understand who your visitors are.' },
              { title: 'Top Landing Pages', desc: 'Which pages bring users in, and which pages cause them to leave — with real bounce data per page.' },
            ].map((item) => (
              <div key={item.title} className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 p-4">
                <p className="text-sm font-semibold text-zinc-100 dark:text-gray-200 mb-1">{item.title}</p>
                <p className="text-xs text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-[#fef9c3] rounded-2xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white dark:text-gray-100">Connect Google Analytics 4</h3>
            <p className="text-sm text-zinc-400 mt-1 mb-5 max-w-sm mx-auto">
              GA4 gives you data Shopify can't — real page-level traffic, user demographics, custom events, and goal tracking.
            </p>
            <a href="/integrations" className="inline-flex items-center gap-2 bg-[#4285F4] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#3367d6] transition-colors">
              Connect Google Analytics →
            </a>
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Tab = 'shopify' | 'google'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('shopify')

  return (
    <div className="min-h-screen bg-zinc-950 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white dark:text-gray-100">Analytics</h1>
          <p className="text-sm text-zinc-400 mt-1">Real-time store performance and website traffic data</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-zinc-900 dark:bg-gray-900 border border-white/10 dark:border-gray-700 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('shopify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'shopify'
                ? 'bg-[#5e8e3e] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-300 dark:hover:text-gray-300'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Shopify Store
          </button>
          <button
            onClick={() => setTab('google')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'google'
                ? 'bg-[#4285F4] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-300 dark:hover:text-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Google Analytics
          </button>
        </div>

        {/* Tab content */}
        {tab === 'shopify' ? <ShopifyTab /> : <GoogleAnalyticsTab />}
      </div>
    </div>
  )
}
