import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Globe,
  LineChart,
  Package,
  Plug,
  ShoppingBag,
  Target,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'

/* ─── Shared bits ─────────────────────────────────────────────────────────── */

function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && (
        <span className="mb-3 inline-flex rounded-full border border-[#ec4899]/25 bg-[#ec4899]/10 px-3 py-1 text-xs font-medium text-[#f472b6]">
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-sm leading-6 text-[#a79fd6] sm:text-base">{sub}</p>}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#221c4e]/70 ${className}`}>
      {children}
    </div>
  )
}

/* ─── Dashboard mockups (pure CSS, no libs) ───────────────────────────────── */

function MiniKpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.08] bg-[#171233]/60 p-2.5">
      <p className="truncate text-[9px] font-medium uppercase tracking-wider text-[#8d87b8]">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${accent ? 'text-[#f472b6]' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function MiniBars({ heights, color = 'bg-[#ec4899]' }: { heights: number[]; color?: string }) {
  return (
    <div className="flex h-20 items-end gap-1">
      {heights.map((h, i) => (
        <div key={i} className={`flex-1 rounded-t-sm ${color}`} style={{ height: `${h}%`, opacity: 0.55 + (h / 100) * 0.45 }} />
      ))}
    </div>
  )
}

function StatusDot({ color }: { color: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
}

function HeroMockup() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#221c4e]/80 p-3 shadow-[0_20px_60px_-20px_rgba(245,158,11,0.15)] sm:p-4">
      {/* window chrome */}
      <div className="mb-3 flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
        <span className="h-2 w-2 rounded-full bg-[#3a3272]" />
        <span className="h-2 w-2 rounded-full bg-[#3a3272]" />
        <span className="h-2 w-2 rounded-full bg-[#ec4899]/70" />
        <span className="ml-2 text-[10px] text-[#8d87b8]">Ecom Panel — Dashboard</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniKpi label="Revenue" value="PKR 1.8M" accent />
        <MiniKpi label="Orders" value="426" />
        <MiniKpi label="Meta ROAS" value="3.4x" accent />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-2.5">
          <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-[#8d87b8]">Sales trend</p>
          <MiniBars heights={[35, 55, 40, 70, 60, 85, 100]} />
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-[#8d87b8]">GA4 traffic</p>
            <p className="mt-0.5 text-sm font-semibold text-white">12,480 <span className="text-[10px] font-normal text-[#8d87b8]">sessions</span></p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-2.5">
            <p className="mb-1.5 text-[9px] font-medium uppercase tracking-wider text-[#8d87b8]">Courier status</p>
            <div className="space-y-1 text-[10px] text-[#a79fd6]">
              <p className="flex items-center gap-1.5"><StatusDot color="bg-green-500" /> Delivered <span className="ml-auto text-white">312</span></p>
              <p className="flex items-center gap-1.5"><StatusDot color="bg-[#ec4899]" /> In transit <span className="ml-auto text-white">84</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-2.5">
          <p className="mb-1.5 text-[9px] font-medium uppercase tracking-wider text-[#8d87b8]">Top products</p>
          {['Premium T-Shirt', 'Hoodie Classic', 'Jogger Pants'].map((p, i) => (
            <div key={p} className="flex items-center justify-between py-0.5 text-[10px]">
              <span className="truncate text-[#c7c2e8]">{p}</span>
              <span className="ml-2 shrink-0 text-[#f472b6]">{['12.4k', '10.1k', '8.3k'][i]}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-[#8d87b8]">Pending orders</p>
            <p className="mt-0.5 text-sm font-semibold text-white">38</p>
          </div>
          <div className="rounded-lg border border-[#ec4899]/25 bg-[#ec4899]/[0.08] p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-[#f472b6]/80">Profit overview</p>
            <p className="mt-0.5 text-sm font-semibold text-[#f472b6]">+PKR 640K</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function WideMockup() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#221c4e]/80 p-3 sm:p-5">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <MiniKpi label="Revenue" value="PKR 1.8M" accent />
        <MiniKpi label="Orders" value="426" />
        <MiniKpi label="Ad Spend" value="PKR 310K" />
        <MiniKpi label="ROAS" value="3.4x" accent />
        <MiniKpi label="Delivered" value="312" />
        <MiniKpi label="Return Rate" value="4.2%" />
        <MiniKpi label="Profit Est." value="PKR 640K" accent />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#8d87b8]">Sales trend</p>
          <MiniBars heights={[30, 45, 38, 60, 52, 74, 68, 90, 82, 100, 88, 95]} />
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#8d87b8]">Ad performance</p>
          <MiniBars heights={[55, 40, 70, 45, 85, 60, 75, 50, 90, 65, 80, 100]} color="bg-[#db2777]" />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#8d87b8]">Recent orders</p>
          {[['#4821', 'Delivered'], ['#4820', 'In transit'], ['#4819', 'Confirmed'], ['#4818', 'Pending']].map(([id, st]) => (
            <div key={id} className="flex items-center justify-between border-t border-white/[0.05] py-1.5 text-[10px] first:border-0">
              <span className="text-[#c7c2e8]">{id}</span>
              <span className={st === 'Delivered' ? 'text-green-400' : st === 'Pending' ? 'text-[#8d87b8]' : 'text-[#f472b6]'}>{st}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#8d87b8]">Courier status</p>
          {[['Delivered', '312', 'bg-green-500'], ['In transit', '84', 'bg-[#ec4899]'], ['Returned', '18', 'bg-red-500'], ['Failed attempt', '9', 'bg-[#6d64b8]']].map(([l, v, c]) => (
            <div key={l} className="flex items-center gap-2 py-1 text-[10px] text-[#a79fd6]">
              <StatusDot color={c} /> {l} <span className="ml-auto text-white">{v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-[#171233]/60 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#8d87b8]">Top products</p>
          {[['Premium T-Shirt', 'PKR 12.4K'], ['Hoodie Classic', 'PKR 10.1K'], ['Jogger Pants', 'PKR 8.3K'], ['Cap Minimal', 'PKR 5.6K']].map(([p, v]) => (
            <div key={p} className="flex items-center justify-between py-1 text-[10px]">
              <span className="truncate text-[#c7c2e8]">{p}</span>
              <span className="ml-2 shrink-0 text-[#f472b6]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Content data ────────────────────────────────────────────────────────── */

const PROBLEMS = [
  { icon: ShoppingBag, text: 'Shopify shows orders, but not complete ad performance.' },
  { icon: Target, text: 'Meta Ads shows spend, but not full store profitability.' },
  { icon: Globe, text: 'Google Analytics shows traffic, but not courier and order status.' },
  { icon: Truck, text: 'Courier data stays separate from marketing and sales reports.' },
]

const SOLUTION_POINTS = [
  'Live order tracking',
  'Shopify sales overview',
  'Meta Ads spend and ROAS tracking',
  'Google Analytics traffic insights',
  'Courier delivery analytics',
  'Customer behavior overview',
  'Product performance reports',
  'Daily, weekly, monthly business summaries',
]

const FEATURES = [
  { icon: ShoppingBag, title: 'Shopify Analytics', desc: 'Track sales, orders, average order value, top products, refunds, and customer trends.' },
  { icon: Target, title: 'Meta Ads Monitoring', desc: 'View ad spend, ROAS, campaign performance, CPC, CTR, CPA, and sales impact.' },
  { icon: BarChart3, title: 'Google Analytics Insights', desc: 'Monitor sessions, traffic sources, conversion paths, landing pages, and user behavior.' },
  { icon: Truck, title: 'Courier Analytics', desc: 'Track deliveries, pending parcels, returns, failed deliveries, courier performance, and delivery timelines.' },
  { icon: ClipboardList, title: 'Orders Review Panel', desc: 'Review confirmed, pending, delivered, cancelled, and returned orders from one place.' },
  { icon: FileText, title: 'Business Reports', desc: 'View daily performance, growth trends, profit direction, and decision-making reports.' },
]

const INTEGRATIONS = [
  { icon: ShoppingBag, label: 'Shopify' },
  { icon: Target, label: 'Meta Ads' },
  { icon: BarChart3, label: 'Google Analytics' },
  { icon: Truck, label: 'Courier APIs' },
  { icon: CreditCard, label: 'Payment data' },
  { icon: Users, label: 'Customer data' },
  { icon: Package, label: 'Product data' },
]

const USE_CASES = [
  { title: 'For Ecommerce Store Owners', desc: 'See sales, orders, ads, delivery, and growth without opening 5 platforms.' },
  { title: 'For Agencies', desc: 'Monitor multiple client stores and report performance faster.' },
  { title: 'For Marketing Teams', desc: 'Connect ad spend with real sales and courier outcomes.' },
  { title: 'For Operations Teams', desc: 'Track pending orders, delivery issues, and returns from one dashboard.' },
]

const BENEFITS = [
  'Save hours on manual reporting.',
  'Reduce confusion between ad data and store sales.',
  'Track courier issues before they damage customer experience.',
  'Make faster marketing and stock decisions.',
  'Get one clean view for sales, ads, orders, customers, and delivery.',
]

const REPORTS = [
  { icon: LineChart, title: 'Daily Sales Report' },
  { icon: Target, title: 'Ad Performance Report' },
  { icon: Truck, title: 'Courier Report' },
  { icon: Boxes, title: 'Product Performance Report' },
  { icon: Users, title: 'Customer Report' },
  { icon: TrendingUp, title: 'Monthly Growth Report' },
]

const TESTIMONIALS = [
  { name: '[Client Name]', type: '[Store Type — e.g. Fashion, Shopify]', quote: '[Short feedback about how Ecom Panel simplified their reporting will appear here.]' },
  { name: '[Client Name]', type: '[Store Type — e.g. Agency, 8 clients]', quote: '[Short feedback about managing multiple stores from one panel will appear here.]' },
  { name: '[Client Name]', type: '[Store Type — e.g. COD brand]', quote: '[Short feedback about courier and order visibility will appear here.]' },
]

const PLANS = [
  {
    name: 'Starter',
    tagline: 'For small Shopify stores',
    price: 'Custom Pricing',
    storeLimit: '1 store',
    support: 'Email support',
    cta: 'Get Started',
    href: '/signup',
    featured: false,
  },
  {
    name: 'Growth',
    tagline: 'For scaling ecommerce teams',
    price: 'Custom Pricing',
    storeLimit: 'Up to 3 stores',
    support: 'Priority support',
    cta: 'Book Demo',
    href: '/signup',
    featured: true,
  },
  {
    name: 'Agency',
    tagline: 'For agencies managing multiple stores',
    price: 'Contact Sales',
    storeLimit: 'Unlimited stores',
    support: 'Dedicated support',
    cta: 'Book Demo',
    href: '/signup',
    featured: false,
  },
]

const PLAN_FEATURES = ['Shopify analytics', 'Orders dashboard', 'Meta Ads tracking', 'Google Analytics tracking', 'Courier reports']

const FAQS = [
  { q: 'What is Ecom Panel?', a: 'Ecom Panel is an ecommerce dashboard where store owners track Shopify, ads, analytics, courier, orders, and reports in one place.' },
  { q: 'Does it work with Shopify?', a: 'Yes, it is designed for Shopify stores.' },
  { q: 'Does it show Meta Ads data?', a: 'Yes, it helps track Meta Ads performance with ecommerce results.' },
  { q: 'Does it include courier analytics?', a: 'Yes — courier delivery, pending orders, returns, and delivery status have their own analytics view.' },
  { q: 'Is it useful for agencies?', a: 'Yes, agencies use it to manage ecommerce clients and reporting from one place.' },
]

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#171233] text-white">

      {/* ── Header ── */}


      {/* ── Hero ── */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <span className="mb-4 inline-flex rounded-full border border-[#ec4899]/25 bg-[#ec4899]/10 px-3 py-1 text-xs font-medium text-[#f472b6]">
              Shopify · Meta Ads · GA4 · Courier · Orders · Reports
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Control Your Entire Ecommerce Business From <span className="text-[#f472b6]">One Dashboard</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#a79fd6] sm:text-lg">
              Track Shopify orders, Meta Ads, Google Analytics, courier performance, revenue, ROAS, customer data, and business reports in one clean panel.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ec4899] px-6 py-3 text-sm font-semibold text-black transition-colors hover:opacity-90">
                Book a Demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]">
                View Dashboard Preview
              </Link>
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-b border-white/[0.06] bg-[#221c4e]/40">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center">
          <p className="text-sm text-[#8d87b8]">Built for Shopify stores, ecommerce agencies, and performance marketing teams.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['Shopify', 'Meta Ads', 'Google Analytics', 'Courier', 'Orders', 'Reports'].map((b) => (
              <span key={b} className="rounded-full border border-white/10 bg-[#221c4e]/70 px-3 py-1.5 text-xs font-medium text-[#a79fd6]">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="The Problem" title="Ecommerce Data Is Scattered Everywhere" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map(({ icon: Icon, text }) => (
            <Card key={text} className="p-5">
              <Icon className="mb-3 h-5 w-5 text-[#8d87b8]" />
              <p className="text-sm leading-6 text-[#c7c2e8]">{text}</p>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-center text-base font-medium text-[#f472b6]">Ecom Panel brings all business data into one view.</p>
      </section>

      {/* ── Solution ── */}
      <section className="border-y border-white/[0.06] bg-[#221c4e]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <SectionHeading eyebrow="The Solution" title="One Panel For Every Key Ecommerce Metric" />
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <HeroMockup />
            <ul className="grid gap-3 sm:grid-cols-2">
              {SOLUTION_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-[#221c4e]/60 p-3 text-sm text-[#c7c2e8]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f472b6]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="Features" title="Everything Your Store Runs On, In One Place" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="p-6 transition-colors hover:border-[#ec4899]/35">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-[#ec4899]/25 bg-[#ec4899]/10">
                <Icon className="h-5 w-5 text-[#f472b6]" />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#a79fd6]">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Dashboard preview ── */}
      <section id="preview" className="scroll-mt-20 border-y border-white/[0.06] bg-[#221c4e]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <SectionHeading eyebrow="Dashboard Preview" title="Designed For Fast Decisions" />
          <WideMockup />
          <div className="mt-8 text-center">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]">
              Open Live Dashboard Preview <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section id="integrations" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:py-20">
        <SectionHeading
          eyebrow="Integrations"
          title="Connect Your Ecommerce Stack"
          sub="Ecom Panel connects your key platforms so your team sees one source of business truth."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {INTEGRATIONS.map(({ icon: Icon, label }) => (
            <Card key={label} className="flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-[#ec4899]/35">
              <Icon className="h-5 w-5 text-[#a79fd6]" />
              <span className="text-xs font-medium text-[#c7c2e8]">{label}</span>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="border-y border-white/[0.06] bg-[#221c4e]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <SectionHeading eyebrow="Use Cases" title="Who Is Ecom Panel For?" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map(({ title, desc }) => (
              <Card key={title} className="p-5">
                <h3 className="text-sm font-semibold text-[#f472b6]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#a79fd6]">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="Benefits" title="Why Teams Use Ecom Panel" />
        <ul className="mx-auto max-w-2xl space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-[#221c4e]/60 p-4 text-sm text-[#c7c2e8] sm:text-base">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f472b6]" />
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Reports ── */}
      <section className="border-y border-white/[0.06] bg-[#221c4e]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <SectionHeading eyebrow="Reporting" title="Reports Your Team Understands" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map(({ icon: Icon, title }) => (
              <Link key={title} href="/reports" className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#221c4e]/70 p-5 transition-colors hover:border-[#ec4899]/45">
                <Icon className="h-5 w-5 text-[#f472b6]" />
                <span className="text-sm font-medium text-white">{title}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-[#6d64b8] transition-colors group-hover:text-[#f472b6]" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof (placeholder) ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="Social Proof" title="Built For Ecommerce Teams Who Need Clarity" />
        <div className="grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} className="p-6">
              <p className="text-sm italic leading-6 text-[#a79fd6]">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-[#8d87b8]">{t.type}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="scroll-mt-20 border-y border-white/[0.06] bg-[#221c4e]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <SectionHeading eyebrow="Pricing" title="Simple Plans For Growing Stores" />
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <Card key={plan.name} className={`flex flex-col p-6 ${plan.featured ? 'border-[#ec4899]/45 shadow-[0_0_40px_-12px_rgba(245,158,11,0.25)]' : ''}`}>
                {plan.featured && (
                  <span className="mb-3 w-fit rounded-full bg-[#ec4899] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">Most Popular</span>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-[#8d87b8]">{plan.tagline}</p>
                <p className="mt-4 text-xl font-semibold text-[#f472b6]">{plan.price}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-[#c7c2e8]">
                  {PLAN_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#f472b6]" /> {f}
                    </li>
                  ))}
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#f472b6]" /> {plan.support}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#f472b6]" /> {plan.storeLimit}</li>
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.featured
                      ? 'bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white hover:opacity-90'
                      : 'border border-white/15 text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section id="faqs" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="FAQs" title="Frequently Asked Questions" />
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-white/[0.08] bg-[#221c4e]/70 p-5 open:border-[#ec4899]/35">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
                {q}
                <Plug className="h-4 w-4 rotate-90 text-[#6d64b8] transition-transform group-open:rotate-0 group-open:text-[#f472b6]" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-[#a79fd6]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section id="contact" className="scroll-mt-20 border-t border-white/[0.06] bg-gradient-to-b from-[#221c4e]/40 to-[#ec4899]/[0.08]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">Stop Switching Between Platforms</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#a79fd6] sm:text-base">
            Bring your Shopify, ads, analytics, orders, courier, and reports into one ecommerce dashboard.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ec4899] px-6 py-3 text-sm font-semibold text-black transition-colors hover:opacity-90">
              Book a Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.06]">
              View Dashboard Preview
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.08] bg-[#171233]">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 text-base font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ec4899] text-xs font-black text-black">E</span>
                Ecom Panel
              </Link>
              <p className="mt-3 text-xs leading-5 text-[#8d87b8]">One dashboard for Shopify, ads, analytics, courier, orders, and reports.</p>
            </div>
            {[
              { heading: 'Product', links: [['Features', '#features'], ['Integrations', '#integrations'], ['Pricing', '#pricing'], ['Dashboard Preview', '/dashboard']] },
              { heading: 'Company', links: [['About', '/'], ['Contact', '#contact'], ['Support', '#contact']] },
              { heading: 'Resources', links: [['FAQs', '#faqs'], ['Documentation', '#faqs'], ['Reports', '/reports']] },
              { heading: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms', '/terms']] },
            ].map((col) => (
              <div key={col.heading}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8d87b8]">{col.heading}</p>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-sm text-[#a79fd6] transition-colors hover:text-white">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-white/[0.06] pt-6 text-center text-xs text-[#6d64b8]">
            &copy; {new Date().getFullYear()} Ecom Panel. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
