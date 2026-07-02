'use client'

import { useEffect, useState } from 'react'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SimpleBarChart } from '@/components/charts/bar-chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/loading'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { RefreshCw, AlertCircle, Target, Image, LayoutGrid, ChevronDown, ChevronRight, ExternalLink, Zap } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Insights {
  spend: number; impressions: number; clicks: number; ctr: number
  cpc: number; cpm: number; reach: number; purchases: number
  revenue: number; addToCart: number; leads: number
}

interface Campaign { id: string; name: string; status: string; objective: string; dailyBudget: number; lifetimeBudget: number; insights: Insights }
interface AdSet { id: string; name: string; status: string; campaignId: string; dailyBudget: number; optimizationGoal: string; insights: Insights }
interface Ad { id: string; name: string; status: string; adsetId: string; campaignId: string; creative: { thumbnailUrl: string; imageUrl: string; title: string; body: string }; insights: Insights }

interface MetaData { adAccountId: string; totalInsights: Insights; campaigns: Campaign[]; adsets: AdSet[]; ads: Ad[] }

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO: MetaData = {
  adAccountId: 'act_demo',
  totalInsights: { spend: 48200, impressions: 1240000, clicks: 18600, ctr: 1.5, cpc: 2.59, cpm: 38.87, reach: 890000, purchases: 342, revenue: 187500, addToCart: 1240, leads: 86 },
  campaigns: [
    { id: '1', name: 'Summer Collection — Conversions', status: 'ACTIVE', objective: 'OUTCOME_SALES', dailyBudget: 5000, lifetimeBudget: 0, insights: { spend: 22400, impressions: 560000, clicks: 8400, ctr: 1.5, cpc: 2.67, cpm: 40, reach: 420000, purchases: 168, revenue: 92400, addToCart: 610, leads: 0 } },
    { id: '2', name: 'Retargeting — Cart Abandoners', status: 'ACTIVE', objective: 'OUTCOME_SALES', dailyBudget: 2000, lifetimeBudget: 0, insights: { spend: 14600, impressions: 380000, clicks: 6200, ctr: 1.63, cpc: 2.35, cpm: 38.42, reach: 280000, purchases: 124, revenue: 68100, addToCart: 430, leads: 0 } },
    { id: '3', name: 'Brand Awareness — Broad', status: 'PAUSED', objective: 'OUTCOME_AWARENESS', dailyBudget: 1500, lifetimeBudget: 0, insights: { spend: 7200, impressions: 220000, clicks: 2800, ctr: 1.27, cpc: 2.57, cpm: 32.73, reach: 180000, purchases: 38, revenue: 20900, addToCart: 160, leads: 0 } },
    { id: '4', name: 'Lead Gen — New Customers', status: 'ACTIVE', objective: 'OUTCOME_LEADS', dailyBudget: 1000, lifetimeBudget: 0, insights: { spend: 4000, impressions: 80000, clicks: 1200, ctr: 1.5, cpc: 3.33, cpm: 50, reach: 10000, purchases: 12, revenue: 6100, addToCart: 40, leads: 86 } },
  ],
  adsets: [
    { id: 'a1', name: 'Lookalike 1% — Purchasers', status: 'ACTIVE', campaignId: '1', dailyBudget: 2500, optimizationGoal: 'OFFSITE_CONVERSIONS', insights: { spend: 11200, impressions: 280000, clicks: 4200, ctr: 1.5, cpc: 2.67, cpm: 40, reach: 210000, purchases: 84, revenue: 46200, addToCart: 310, leads: 0 } },
    { id: 'a2', name: 'Interest — Fashion 18-35', status: 'ACTIVE', campaignId: '1', dailyBudget: 2500, optimizationGoal: 'OFFSITE_CONVERSIONS', insights: { spend: 11200, impressions: 280000, clicks: 4200, ctr: 1.5, cpc: 2.67, cpm: 40, reach: 210000, purchases: 84, revenue: 46200, addToCart: 300, leads: 0 } },
    { id: 'a3', name: 'Cart — 3 day window', status: 'ACTIVE', campaignId: '2', dailyBudget: 1000, optimizationGoal: 'OFFSITE_CONVERSIONS', insights: { spend: 7300, impressions: 190000, clicks: 3100, ctr: 1.63, cpc: 2.35, cpm: 38.42, reach: 140000, purchases: 62, revenue: 34100, addToCart: 210, leads: 0 } },
    { id: 'a4', name: 'Viewer — 7 day window', status: 'ACTIVE', campaignId: '2', dailyBudget: 1000, optimizationGoal: 'OFFSITE_CONVERSIONS', insights: { spend: 7300, impressions: 190000, clicks: 3100, ctr: 1.63, cpc: 2.35, cpm: 38.42, reach: 140000, purchases: 62, revenue: 34000, addToCart: 220, leads: 0 } },
  ],
  ads: [
    { id: 'd1', name: 'Video — Hoodie Unboxing', status: 'ACTIVE', adsetId: 'a1', campaignId: '1', creative: { thumbnailUrl: '', imageUrl: '', title: 'Hoodie Classic — Free Shipping', body: 'Stay warm this season 🧥 Shop now and get free delivery.' }, insights: { spend: 5600, impressions: 140000, clicks: 2100, ctr: 1.5, cpc: 2.67, cpm: 40, reach: 105000, purchases: 42, revenue: 23100, addToCart: 155, leads: 0 } },
    { id: 'd2', name: 'Carousel — Top Products', status: 'ACTIVE', adsetId: 'a1', campaignId: '1', creative: { thumbnailUrl: '', imageUrl: '', title: 'New Arrivals Are Here', body: 'Browse our best sellers. Limited stock available!' }, insights: { spend: 5600, impressions: 140000, clicks: 2100, ctr: 1.5, cpc: 2.67, cpm: 40, reach: 105000, purchases: 42, revenue: 23100, addToCart: 155, leads: 0 } },
    { id: 'd3', name: 'Static — Premium T-Shirt', status: 'ACTIVE', adsetId: 'a2', campaignId: '1', creative: { thumbnailUrl: '', imageUrl: '', title: 'Premium T-Shirt — PKR 1,500', body: 'Quality fabric, perfect fit. Order today!' }, insights: { spend: 5600, impressions: 140000, clicks: 2100, ctr: 1.5, cpc: 2.67, cpm: 40, reach: 105000, purchases: 42, revenue: 23100, addToCart: 155, leads: 0 } },
    { id: 'd4', name: 'Retargeting — Dynamic Catalog', status: 'ACTIVE', adsetId: 'a3', campaignId: '2', creative: { thumbnailUrl: '', imageUrl: '', title: 'You Left Something Behind', body: 'Complete your purchase — items are selling fast!' }, insights: { spend: 7300, impressions: 190000, clicks: 3100, ctr: 1.63, cpc: 2.35, cpm: 38.42, reach: 140000, purchases: 62, revenue: 34100, addToCart: 210, leads: 0 } },
    { id: 'd5', name: 'Lead — Discount Offer', status: 'ACTIVE', adsetId: 'a4', campaignId: '4', creative: { thumbnailUrl: '', imageUrl: '', title: 'Get 15% Off Your First Order', body: 'Sign up now and unlock your exclusive discount. Limited time only!' }, insights: { spend: 4000, impressions: 80000, clicks: 1200, ctr: 1.5, cpc: 3.33, cpm: 50, reach: 60000, purchases: 12, revenue: 6100, addToCart: 40, leads: 86 } },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'ACTIVE') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">Active</span>
  if (status === 'PAUSED') return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">Paused</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">{status}</span>
}

function roas(insights: Insights) {
  return insights.spend > 0 ? (insights.revenue / insights.spend).toFixed(2) : '—'
}

function fmt(n: number) { return formatNumber(Math.round(n)) }

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: 'last_7d' },
  { label: '30 Days', value: 'last_30d' },
  { label: '90 Days', value: 'last_90d' },
]

// ─── Creative Thumbnail ───────────────────────────────────────────────────────

function CreativeThumbnail({ url, title }: { url: string; title: string }) {
  const initials = (title || 'Ad').slice(0, 2).toUpperCase()
  if (url) return <img src={url} alt={title} className="w-14 h-14 object-cover rounded-lg border border-white/10 shrink-0" />
  return (
    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
      {initials}
    </div>
  )
}

// ─── Tab buttons ──────────────────────────────────────────────────────────────

function Tab({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#1877F2] text-white' : 'text-zinc-400 hover:text-zinc-300 dark:hover:text-gray-300'}`}>
      {icon} {label}
      {count !== undefined && <span className={`text-xs rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20' : 'bg-zinc-800 text-zinc-400'}`}>{count}</span>}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'campaigns' | 'ads'

function EmptyRangeState({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-6 text-center">
      <p className="text-sm font-semibold text-white dark:text-gray-100">{title}</p>
      <p className="text-xs text-zinc-400 mt-1">{body}</p>
    </div>
  )
}

export default function MetaPage() {
  const [data, setData] = useState<MetaData>(DEMO)
  const [loading, setLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(true)
  const [error, setError] = useState('')
  const [preset, setPreset] = useState('last_30d')
  const [tab, setTab] = useState<ActiveTab>('overview')
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL')

  async function fetchData(p = preset) {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/meta/data?preset=${p}`)
      if (!res.ok) {
        const e = await res.json()
        if (e.demo) { setIsDemo(true); setData(DEMO) }
        else throw new Error(e.error || 'Failed to fetch Meta data')
      } else {
        const d = await res.json()
        setData(d); setIsDemo(false)
      }
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredCampaigns = data.campaigns.filter(c => statusFilter === 'ALL' || c.status === statusFilter)
  const filteredAds = data.ads.filter(a => statusFilter === 'ALL' || a.status === statusFilter)

  const ti = data.totalInsights

  return (
    <div className="min-h-screen bg-zinc-950 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white dark:text-gray-100">Meta Ads</h1>
                <p className="text-sm text-zinc-400">Facebook & Instagram ad performance</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isDemo && <Badge variant="secondary" className="text-xs">Demo Data</Badge>}
            {!isDemo && data.adAccountId && (
              <span className="text-xs bg-green-500/10 border border-green-500/25 text-green-400 rounded-full px-3 py-1 font-medium">
                {data.adAccountId}
              </span>
            )}
            <button onClick={() => { fetchData(); toast.info('Refreshing…') }} disabled={loading}
              className="flex items-center gap-1.5 text-xs border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {isDemo && (
              <a href="/integrations" className="flex items-center gap-1.5 text-xs bg-[#1877F2] text-white rounded-lg px-3 py-2 hover:opacity-90 transition-opacity font-medium">
                <Zap className="w-3.5 h-3.5" /> Connect Meta
              </a>
            )}
          </div>
        </div>

        {/* Date presets */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PRESETS.map((p) => (
            <button key={p.value} onClick={() => { setPreset(p.value); fetchData(p.value) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${preset === p.value ? 'bg-amber-500 text-black border-amber-500 font-semibold' : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/20 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-300 rounded-lg p-3 mb-5 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? <LoadingSpinner /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <KPICard title="Total Spend" value={formatCurrency(ti.spend)} />
              <KPICard title="Revenue" value={formatCurrency(ti.revenue)} />
              <KPICard title="ROAS" value={ti.spend > 0 ? `${(ti.revenue / ti.spend).toFixed(2)}x` : '—'} />
              <KPICard title="Purchases" value={fmt(ti.purchases)} />
              <KPICard title="Add to Cart" value={fmt(ti.addToCart)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              <KPICard title="Impressions" value={ti.impressions >= 1000000 ? `${(ti.impressions/1000000).toFixed(1)}M` : fmt(ti.impressions)} />
              <KPICard title="Clicks" value={fmt(ti.clicks)} />
              <KPICard title="CTR" value={`${Number(ti.ctr).toFixed(2)}%`} />
              <KPICard title="CPC" value={formatCurrency(ti.cpc)} />
              <KPICard title="CPM" value={formatCurrency(ti.cpm)} />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900 dark:bg-gray-900 border border-white/10 dark:border-gray-700 rounded-xl p-1 mb-6 w-fit flex-wrap">
              <Tab active={tab === 'overview'} onClick={() => setTab('overview')} icon={<LayoutGrid className="w-4 h-4" />} label="Overview" />
              <Tab active={tab === 'campaigns'} onClick={() => setTab('campaigns')} icon={<Target className="w-4 h-4" />} label="Campaigns" count={data.campaigns.length} />
              <Tab active={tab === 'ads'} onClick={() => setTab('ads')} icon={<Image className="w-4 h-4" />} label="Creatives" count={data.ads.length} />
            </div>

            {/* Status filter */}
            <div className="flex gap-2 mb-5">
              {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-amber-500 text-black border-amber-500 font-semibold' : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/20 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {s === 'ALL' ? 'All' : s === 'ACTIVE' ? '🟢 Active' : '⏸ Paused'}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ── */}
            {tab === 'overview' && (
              <div className="space-y-5">
                {/* Spend by Campaign chart */}
                <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
                  <SimpleBarChart
                    data={data.campaigns.map(c => ({ label: c.name.slice(0, 20), value: c.insights.spend }))}
                    title="Spend by Campaign (PKR)"
                    color="#f59e0b"
                  />
                </div>

                {/* ROAS by Campaign */}
                <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
                  <SimpleBarChart
                    data={data.campaigns.map(c => ({ label: c.name.slice(0, 20), value: c.insights.spend > 0 ? Number((c.insights.revenue / c.insights.spend).toFixed(2)) : 0 }))}
                    title="ROAS by Campaign"
                    color="#fbbf24"
                  />
                </div>

                {/* Purchases by Campaign */}
                <div className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 p-5">
                  <SimpleBarChart
                    data={data.campaigns.map(c => ({ label: c.name.slice(0, 20), value: c.insights.purchases }))}
                    title="Purchases by Campaign"
                    color="#d97706"
                  />
                </div>
              </div>
            )}

            {/* ── Campaigns Tab ── */}
            {tab === 'campaigns' && (
              <div className="space-y-3">
                {filteredCampaigns.length === 0 && (
                  <EmptyRangeState
                    title="No campaigns delivered in this range"
                    body="Campaigns appear here only when Meta reports spend, impressions, clicks, purchases, or other activity for the selected dates."
                  />
                )}
                {filteredCampaigns.map((c) => {
                  const isOpen = expandedCampaign === c.id
                  const campaignAdsets = data.adsets.filter(a => a.campaignId === c.id)
                  return (
                    <div key={c.id} className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 overflow-hidden">
                      {/* Campaign row */}
                      <button className="w-full text-left p-4 hover:bg-white/5 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setExpandedCampaign(isOpen ? null : c.id)}>
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-white dark:text-gray-100 truncate">{c.name}</span>
                              {statusBadge(c.status)}
                              <span className="text-xs text-zinc-500 bg-zinc-800 dark:bg-gray-800 rounded px-1.5 py-0.5">{c.objective?.replace('OUTCOME_', '')}</span>
                            </div>
                            <div className="flex gap-4 mt-1.5 flex-wrap">
                              <span className="text-xs text-zinc-400">Spend: <b className="text-zinc-100 dark:text-gray-200">{formatCurrency(c.insights.spend)}</b></span>
                              <span className="text-xs text-zinc-400">Revenue: <b className="text-zinc-100 dark:text-gray-200">{formatCurrency(c.insights.revenue)}</b></span>
                              <span className="text-xs text-zinc-400">ROAS: <b className="text-green-400">{roas(c.insights)}x</b></span>
                              <span className="text-xs text-zinc-400">Purchases: <b className="text-zinc-100 dark:text-gray-200">{c.insights.purchases}</b></span>
                              <span className="text-xs text-zinc-400">CTR: <b className="text-zinc-100 dark:text-gray-200">{Number(c.insights.ctr).toFixed(2)}%</b></span>
                              <span className="text-xs text-zinc-400">Budget: <b className="text-zinc-100 dark:text-gray-200">{c.dailyBudget > 0 ? `${formatCurrency(c.dailyBudget)}/day` : formatCurrency(c.lifetimeBudget)}</b></span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Ad Sets */}
                      {isOpen && campaignAdsets.length > 0 && (
                        <div className="border-t border-white/5 dark:border-gray-800">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-zinc-950 dark:bg-gray-800/50">
                                <TableHead className="text-xs">Ad Set</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs text-right">Spend</TableHead>
                                <TableHead className="text-xs text-right">Revenue</TableHead>
                                <TableHead className="text-xs text-right">ROAS</TableHead>
                                <TableHead className="text-xs text-right">Purchases</TableHead>
                                <TableHead className="text-xs text-right">Clicks</TableHead>
                                <TableHead className="text-xs text-right">CTR</TableHead>
                                <TableHead className="text-xs text-right">CPC</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {campaignAdsets.map((a) => (
                                <TableRow key={a.id}>
                                  <TableCell className="text-xs font-medium max-w-[180px] truncate">{a.name}</TableCell>
                                  <TableCell>{statusBadge(a.status)}</TableCell>
                                  <TableCell className="text-xs text-right">{formatCurrency(a.insights.spend)}</TableCell>
                                  <TableCell className="text-xs text-right">{formatCurrency(a.insights.revenue)}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold text-green-400">{roas(a.insights)}x</TableCell>
                                  <TableCell className="text-xs text-right">{a.insights.purchases}</TableCell>
                                  <TableCell className="text-xs text-right">{fmt(a.insights.clicks)}</TableCell>
                                  <TableCell className="text-xs text-right">{Number(a.insights.ctr).toFixed(2)}%</TableCell>
                                  <TableCell className="text-xs text-right">{formatCurrency(a.insights.cpc)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Creatives Tab ── */}
            {tab === 'ads' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAds.length === 0 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <EmptyRangeState
                      title="No creatives delivered in this range"
                      body="Paused and past creatives still show here when they have historical stats inside the selected dates."
                    />
                  </div>
                )}
                {filteredAds.map((ad) => {
                  const camp = data.campaigns.find(c => c.id === ad.campaignId)
                  return (
                    <div key={ad.id} className="bg-zinc-900 dark:bg-gray-900 rounded-xl border border-white/10 dark:border-gray-700 overflow-hidden flex flex-col">
                      {/* Creative preview */}
                      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 h-36 flex items-center justify-center overflow-hidden">
                        {ad.creative.thumbnailUrl || ad.creative.imageUrl ? (
                          <img src={ad.creative.thumbnailUrl || ad.creative.imageUrl} alt={ad.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center px-4">
                            <div className="w-12 h-12 mx-auto mb-2 bg-[#1877F2] rounded-xl flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </div>
                            {ad.creative.title && <p className="text-xs font-semibold text-zinc-300 dark:text-gray-300 line-clamp-1">{ad.creative.title}</p>}
                          </div>
                        )}
                        <div className="absolute top-2 right-2">{statusBadge(ad.status)}</div>
                      </div>

                      {/* Ad copy */}
                      <div className="p-4 flex-1">
                        <p className="text-sm font-semibold text-white dark:text-gray-100 line-clamp-1 mb-0.5">{ad.name}</p>
                        {ad.creative.title && <p className="text-xs font-medium text-[#1877F2] line-clamp-1">{ad.creative.title}</p>}
                        {ad.creative.body && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{ad.creative.body}</p>}
                        {camp && <p className="text-xs text-zinc-500 mt-2 truncate">📁 {camp.name}</p>}
                      </div>

                      {/* Metrics */}
                      <div className="border-t border-white/5 dark:border-gray-800 px-4 py-3 grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-xs text-zinc-500">Spend</p>
                          <p className="text-sm font-bold text-white dark:text-gray-100">{formatCurrency(ad.insights.spend)}</p>
                        </div>
                        <div className="text-center border-x border-white/5 dark:border-gray-800">
                          <p className="text-xs text-zinc-500">ROAS</p>
                          <p className="text-sm font-bold text-green-400">{roas(ad.insights)}x</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-zinc-500">Purchases</p>
                          <p className="text-sm font-bold text-white dark:text-gray-100">{ad.insights.purchases}</p>
                        </div>
                      </div>
                      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-xs text-zinc-500">Impressions</p>
                          <p className="text-xs font-semibold text-zinc-300 dark:text-gray-300">{ad.insights.impressions >= 1000 ? `${(ad.insights.impressions/1000).toFixed(0)}K` : ad.insights.impressions}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-zinc-500">CTR</p>
                          <p className="text-xs font-semibold text-zinc-300 dark:text-gray-300">{Number(ad.insights.ctr).toFixed(2)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-zinc-500">CPC</p>
                          <p className="text-xs font-semibold text-zinc-300 dark:text-gray-300">{formatCurrency(ad.insights.cpc)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
