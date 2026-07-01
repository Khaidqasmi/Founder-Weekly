import { LinkButton } from '@/components/link-button'
import { BarChart3, Upload, Mail, Shield, TrendingUp, FileText } from 'lucide-react'

const features = [
  { icon: BarChart3, title: 'Live Dashboard', desc: 'Revenue, orders, AOV, ROAS, COD rates — all in one view.' },
  { icon: Upload, title: 'CSV Upload', desc: 'Upload your orders, ads, leads, and inventory from any platform.' },
  { icon: Mail, title: 'Weekly Email Reports', desc: 'Get a professional growth report in your inbox every Monday.' },
  { icon: Shield, title: 'COD Tracking', desc: 'Track COD confirmations, cancellations, and courier status.' },
  { icon: TrendingUp, title: 'Action Plans', desc: 'Know exactly what to do next to grow your business.' },
  { icon: FileText, title: 'Report History', desc: 'Compare week over week performance and spot trends.' },
]

const steps = [
  { num: '1', title: 'Sign Up', desc: 'Create your account in 30 seconds.' },
  { num: '2', title: 'Add Your Data', desc: 'Upload a CSV or enter data manually.' },
  { num: '3', title: 'See Your Dashboard', desc: 'Instant metrics and insights.' },
  { num: '4', title: 'Get Weekly Reports', desc: 'Emailed every Monday morning.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      

      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
          Your Weekly Business Report,<br />Without Messy Spreadsheets
        </h1>
        <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
          Track revenue, orders, ads, COD confirmations, top products, low stock items, and next actions in one clean dashboard.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <LinkButton href="/dashboard" size="lg">Try Free Demo</LinkButton>
          <LinkButton href="/signup" size="lg" variant="outline">Start Free Trial</LinkButton>
        </div>
      </section>

      <section className="bg-zinc-950 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white">Still Using Spreadsheets to Track Your Business?</h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
            Most founders spend hours every week copying data between spreadsheets, manually calculating metrics, and guessing what to do next.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white">One Dashboard. One Weekly Report. Zero Headaches.</h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
            Upload your data or connect your tools. See your metrics update in real time. Get a clean weekly report with exactly what you need to know and do.
          </p>
        </div>
      </section>

      <section className="bg-zinc-950 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-white mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-zinc-900 rounded-lg p-6 shadow-sm">
                <f.icon className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-white mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center mx-auto font-bold">{s.num}</div>
                <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-amber-500 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-black">Ready to Stop Guessing?</h2>
          <p className="mt-4 text-black/70">Start your 7-day free trial. No credit card required.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton href="/dashboard" size="lg" variant="secondary">Try Free Demo</LinkButton>
            <LinkButton href="/signup" size="lg" className="bg-zinc-950 text-white hover:bg-zinc-800">Start Free Trial</LinkButton>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
          <p>&copy; 2024 Founder Weekly Growth Report</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/pricing" className="hover:text-white">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
