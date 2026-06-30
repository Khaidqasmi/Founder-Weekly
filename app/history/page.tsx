'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SimpleBarChart } from '@/components/charts/bar-chart'
import { LoadingSpinner } from '@/components/loading'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'Last Year', days: 365 },
  { label: 'All Time', days: 0 },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [syncRuns, setSyncRuns] = useState<any[]>([])
  const [dateFrom, setDateFrom] = useState(daysAgo(30))
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [tab, setTab] = useState('overview')
  const [orderPage, setOrderPage] = useState(0)
  const [adPage, setAdPage] = useState(0)
  const PAGE_SIZE = 50

  async function fetchData(from: string, to: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?from=${from}&to=${to}`)
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!member) { setLoading(false); return }

      const [ordersRes, adsRes, syncRes] = await Promise.all([
        supabase.from('orders').select('*')
          .eq('workspace_id', member.workspace_id)
          .gte('order_date', from).lte('order_date', to)
          .order('order_date', { ascending: false })
          .limit(500),
        supabase.from('ads').select('*')
          .eq('workspace_id', member.workspace_id)
          .gte('date', from).lte('date', to)
          .order('date', { ascending: false })
          .limit(500),
        supabase.from('sync_runs').select('*')
          .eq('workspace_id', member.workspace_id)
          .order('started_at', { ascending: false })
          .limit(20),
      ])

      setOrders(ordersRes.data || [])
      setAds(adsRes.data || [])
      setSyncRuns(syncRes.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchData(dateFrom, dateTo)
  }, [])

  function applyPreset(days: number) {
    const to = new Date().toISOString().split('T')[0]
    const from = days === 0 ? '2020-01-01' : daysAgo(days)
    setDateFrom(from)
    setDateTo(to)
    setOrderPage(0)
    setAdPage(0)
    fetchData(from, to)
  }

  function handleCustomRange() {
    setOrderPage(0)
    setAdPage(0)
    fetchData(dateFrom, dateTo)
  }

  const m = data?.metrics
  const pagedOrders = orders.slice(orderPage * PAGE_SIZE, (orderPage + 1) * PAGE_SIZE)
  const pagedAds = ads.slice(adPage * PAGE_SIZE, (adPage + 1) * PAGE_SIZE)
  const totalOrderPages = Math.ceil(orders.length / PAGE_SIZE)
  const totalAdPages = Math.ceil(ads.length / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Historical Data</h1>
        <p className="text-sm text-gray-500 mb-6">Browse all your synced and uploaded data across any time period.</p>

        {/* Date Controls */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESETS.map((p) => (
                <Button key={p.label} variant="outline" size="sm" onClick={() => applyPreset(p.days)}>{p.label}</Button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
              </div>
              <Button onClick={handleCustomRange} size="sm">Apply</Button>
            </div>
            {data?.dataMeta && (
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                <span>Showing: <strong>{dateFrom}</strong> to <strong>{dateTo}</strong></span>
                {data.dataMeta.dateRange.earliest && (
                  <span>Data available from: <strong>{data.dataMeta.dateRange.earliest}</strong></span>
                )}
                <span>{orders.length} orders, {ads.length} ad rows in range</span>
                {Object.entries(data.dataMeta.sources.orders || {}).map(([src, count]) => (
                  <Badge key={src} variant="secondary" className="text-xs">{src}: {String(count)} orders</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? <LoadingSpinner /> : (
          <Tabs value={tab} onValueChange={(v: string | null) => v && setTab(v)}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="ads">Ads ({ads.length})</TabsTrigger>
              <TabsTrigger value="syncs">Sync History</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              {m && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <KPICard title="Revenue" value={formatCurrency(m.revenue)} />
                    <KPICard title="Orders" value={formatNumber(m.orders)} />
                    <KPICard title="AOV" value={formatCurrency(m.aov)} />
                    <KPICard title="Ad Spend" value={formatCurrency(m.adSpend)} />
                    <KPICard title="ROAS" value={`${m.roas.toFixed(2)}x`} />
                    <KPICard title="COD Rate" value={formatPercent(m.codConfirmationRate)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
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
                      <SimpleBarChart
                        data={data.charts.productPerformance.map((p: any) => ({ label: p.name, value: p.revenue }))}
                        title="Products by Revenue"
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Orders */}
            <TabsContent value="orders">
              <Card>
                <CardContent className="pt-4 px-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedOrders.map((o: any) => (
                          <TableRow key={o.id}>
                            <TableCell className="text-xs">{o.order_date}</TableCell>
                            <TableCell className="text-xs font-mono">{o.order_id}</TableCell>
                            <TableCell className="text-sm">{o.customer_name}</TableCell>
                            <TableCell className="text-xs">{o.city}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{o.product_name}</TableCell>
                            <TableCell className="text-right text-xs">{o.quantity}</TableCell>
                            <TableCell className="text-right font-medium text-sm">{formatCurrency(o.revenue)}</TableCell>
                            <TableCell><Badge variant={o.order_status === 'Delivered' ? 'default' : o.order_status === 'Cancelled' ? 'destructive' : 'secondary'} className="text-xs">{o.order_status}</Badge></TableCell>
                            <TableCell className="text-xs">{o.payment_method}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{o.source || 'manual'}</Badge></TableCell>
                          </TableRow>
                        ))}
                        {pagedOrders.length === 0 && (
                          <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">No orders in this date range</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {totalOrderPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <span className="text-xs text-gray-500">Page {orderPage + 1} of {totalOrderPages}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={orderPage === 0} onClick={() => setOrderPage(orderPage - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={orderPage >= totalOrderPages - 1} onClick={() => setOrderPage(orderPage + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ads */}
            <TabsContent value="ads">
              <Card>
                <CardContent className="pt-4 px-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Ad Set</TableHead>
                          <TableHead>Ad</TableHead>
                          <TableHead className="text-right">Spend</TableHead>
                          <TableHead className="text-right">Clicks</TableHead>
                          <TableHead className="text-right">Purchases</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedAds.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell className="text-xs">{a.date}</TableCell>
                            <TableCell className="text-xs">{a.platform}</TableCell>
                            <TableCell className="text-xs">{a.campaign_name}</TableCell>
                            <TableCell className="text-xs">{a.ad_set_name}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{a.ad_name}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(a.ad_spend)}</TableCell>
                            <TableCell className="text-right text-xs">{a.clicks}</TableCell>
                            <TableCell className="text-right text-xs">{a.purchases}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(a.purchase_revenue)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{a.source || 'manual'}</Badge></TableCell>
                          </TableRow>
                        ))}
                        {pagedAds.length === 0 && (
                          <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">No ad data in this date range</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {totalAdPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <span className="text-xs text-gray-500">Page {adPage + 1} of {totalAdPages}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={adPage === 0} onClick={() => setAdPage(adPage - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={adPage >= totalAdPages - 1} onClick={() => setAdPage(adPage + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sync History */}
            <TabsContent value="syncs">
              <Card>
                <CardHeader><CardTitle className="text-lg">Sync Runs</CardTitle></CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Fetched</TableHead>
                        <TableHead className="text-right">New</TableHead>
                        <TableHead className="text-right">Updated</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncRuns.map((s: any) => {
                        const dur = s.finished_at
                          ? `${((new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000).toFixed(1)}s`
                          : 'Running...'
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium text-sm capitalize">{s.provider}</TableCell>
                            <TableCell className="text-xs">{s.sync_type}</TableCell>
                            <TableCell>
                              <Badge variant={s.status === 'success' ? 'default' : s.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">{s.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{s.records_fetched}</TableCell>
                            <TableCell className="text-right">{s.records_new}</TableCell>
                            <TableCell className="text-right">{s.records_updated}</TableCell>
                            <TableCell className="text-xs">{new Date(s.started_at).toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{dur}</TableCell>
                            <TableCell className="text-xs text-red-600 max-w-[200px] truncate">{s.error_message || '-'}</TableCell>
                          </TableRow>
                        )
                      })}
                      {syncRuns.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No syncs yet. Connect an integration and sync data.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
