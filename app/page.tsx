import Link from 'next/link'
import { LinkButton } from '@/components/link-button'
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Mail,
  Plug,
  Shield,
  ShoppingBag,
  TrendingUp,
  Truck,
  Upload,
  Zap,
} from 'lucide-react'

const metrics = [
  { label: 'Revenue', value: 'PKR 1.8M', note: '+18.4%' },
  { label: 'Orders', value: '426', note: '+11.2%' },
  { label: 'AOV', value: 'PKR 4,225', note: 'stable' },
  { label: 'Cancel rate', value: '6.8%', note: '-2.1%' },
]

const features = [
  {
    icon: ShoppingBag,
    title: 'Shopify performance',
    desc: 'Track sales, orders, products, conversion funnel, traffic sources, and landing pages without opening five tabs.',
  },
  {
    icon: Truck,
    title: 'COD and courier control',
    desc: 'See confirmations, cancellations, pending shipments, and courier performance before they eat your margin.',
  },
  {
    icon: BarChart3,
    title: 'Ads and analytics view',
    desc: 'Bring Meta, Google Analytics, and store activity into one clean place for faster decisions.',
  },
  {
    icon: Mail,
    title: 'Weekly growth reports',
    desc: 'Send founders a sharp weekly summary with wins, losses, movement, and next actions.',
  },
  {
    icon: Shield,
    title: 'Clean credential handling',
    desc: 'Users connect their own stores and tools from the dashboard instead of sharing private credentials manually.',
  },
  {
    icon: Zap,
    title: 'Fast filter switching',
    desc: 'Designed around quick date ranges, cached views, and responsive dashboards for daily use.',
  },
]

const workflows = [
  { icon: Plug, title: 'Connect', desc: 'Add Shopify, analytics, ad accounts, couriers, or CSV data.' },
  { icon: Activity, title: 'Monitor', desc: 'Watch revenue, orders, sessions, funnels, products, and sources.' },
  { icon: TrendingUp, title: 'Decide', desc: 'Spot what changed and act before the week is already gone.' },
]

const integrations = ['Shopify', 'Meta Ads', 'GA4', 'Courier data', 'CSV upload', 'Email reports']

function DashboardPreview() {
  return (
    <div className="relative w-full max-w-5xl rounded-lg border border-white/10 bg-zinc-950/90 p-3 shadow-2xl shadow-black/40">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-400">Live command view</p>
          <p className="mt-1 text-sm font-semibold text-white">Founder Weekly Dashboard</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-black">Today</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">30D</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">90D</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-lg border border-white/10 bg-zinc-900 p-3">
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
            <p className="mt-1 text-xs text-emerald-400">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Sessions by day</p>
            <p className="text-xs text-zinc-500">Last 30 days</p>
          </div>
          <div className="flex h-44 items-end gap-2 border-b border-zinc-800 pb-2">
            {[22, 28, 19, 34, 26, 38, 31, 44, 35, 52, 48, 68, 61, 74, 43, 58].map((height, index) => (
              <span
                key={index}
                className="w-full rounded-t bg-amber-500"
                style={{ height: `${height}%`, opacity: index > 10 ? 1 : 0.45 }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-900 p-4">
          <p className="text-sm font-semibold text-white">Conversion funnel</p>
          <div className="mt-5 space-y-4">
            {[
              ['Sessions', '715', '100%'],
              ['Product views', '322', '45%'],
              ['Added to cart', '57', '8%'],
              ['Purchased', '13', '1.82%'],
            ].map(([label, value, rate]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-semibold text-white">{value} - {rate}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: rate === '100%' ? '100%' : rate }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <section className="relative flex min-h-[calc(100vh-56px)] items-center overflow-hidden border-b border-white/10 bg-zinc-950">
        <div className="absolute inset-0 opacity-[0.14]" aria-hidden="true">
          <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        <div className="absolute bottom-8 right-[-18rem] hidden w-[64rem] rotate-[-3deg] opacity-70 xl:block" aria-hidden="true">
          <DashboardPreview />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
          <div className="flex max-w-3xl flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Activity className="h-3.5 w-3.5" />
              Ecommerce operating system for founders
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Founder Weekly
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              A fast command center for Shopify stores, COD teams, ad spend, courier movement, and weekly growth reporting. Know what changed, what matters, and what to do next.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/dashboard" size="lg" className="bg-amber-500 text-black hover:bg-amber-400">
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </LinkButton>
              <LinkButton href="/signup" size="lg" variant="outline" className="border-white/15 bg-zinc-950/70 text-white hover:bg-white/10">
                Start Free Trial
              </LinkButton>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ['Live store data', 'Shopify sync'],
                ['Weekly reports', 'Founder-ready'],
                ['COD tracking', 'Courier view'],
              ].map(([title, label]) => (
                <div key={title} className="border-l border-amber-500/50 pl-3">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center lg:pl-6 xl:hidden">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-black py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
          <p className="font-medium text-zinc-200">Connect the tools your store already runs on.</p>
          <div className="flex flex-wrap gap-2">
            {integrations.map((item) => (
              <span key={item} className="rounded-full border border-white/10 px-3 py-1 text-xs">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 py-18 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">Daily operating view</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything important, ready before the next decision.
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
              Founder Weekly pulls the noisy parts of ecommerce into a focused workspace: sales, traffic, sources, products, couriers, reports, and actions.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-white/10 bg-zinc-900 p-5">
                <feature.icon className="h-5 w-5 text-amber-400" />
                <h3 className="mt-5 text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">From raw data to action</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Stop checking dashboards. Start running the week.
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base">
              The system is designed for repeated founder workflows: open the panel, switch the date range, spot movement, and execute the next step.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {workflows.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-white/10 bg-zinc-950 p-5">
                <div className="flex items-center justify-between">
                  <step.icon className="h-5 w-5 text-amber-400" />
                  <span className="text-xs font-semibold text-zinc-600">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 py-18 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="rounded-lg border border-white/10 bg-zinc-900 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black p-4">
                <p className="text-xs text-zinc-500">Top landing page</p>
                <p className="mt-3 text-base font-semibold text-white">Earbuds & Smart Watch</p>
                <p className="mt-1 text-xs text-zinc-500">/collections/earbuds-smart-watch</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">186 sessions</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-medium text-emerald-400">+38%</span>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black p-4">
                <p className="text-xs text-zinc-500">Traffic sources</p>
                <div className="mt-3 space-y-2">
                  {[
                    ['Instagram', '26'],
                    ['Facebook', '18'],
                    ['Meta Ads', '14'],
                    ['TikTok', '9'],
                  ].map(([source, sessions]) => (
                    <div key={source} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{source}</span>
                      <span className="text-xs text-zinc-500">{sessions} sessions</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black p-4">
                <p className="text-xs text-zinc-500">Trending product</p>
                <p className="mt-3 text-base font-semibold text-white">Smart Watch Pro X</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">24 orders</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-medium text-emerald-400">Best seller</span>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black p-4">
                <p className="text-xs text-zinc-500">Weekly report</p>
                <p className="mt-3 text-base font-semibold text-white">Ready Monday</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Email draft</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-medium text-emerald-400">Auto summary</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">Built for real stores</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Clear enough for daily use. Deep enough for growth decisions.
            </h2>
            <div className="mt-6 space-y-4">
              {[
                'Switch between Today, Yesterday, 7D, 30D, 90D, and custom ranges.',
                'Keep Shopify, analytics, ads, courier, and report history in one place.',
                'Protect each user connection with their own credentials and workspace.',
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-zinc-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-amber-500 py-16 text-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Run the business from one sharp dashboard.</h2>
            <p className="mt-3 text-sm leading-6 text-black/70 sm:text-base">
              Start with the live dashboard, connect your store, then let weekly reports keep the whole team aligned.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/dashboard" size="lg" className="bg-black text-white hover:bg-zinc-900">
              View Dashboard
            </LinkButton>
            <LinkButton href="/pricing" size="lg" variant="outline" className="border-black/20 bg-amber-400 text-black hover:bg-amber-300">
              See Pricing
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="bg-black py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>2026 Founder Weekly Growth Report</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
