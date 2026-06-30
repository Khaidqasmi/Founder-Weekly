'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Unplug, ExternalLink, Loader2, ChevronRight, Store, BarChart3, Target, MessageSquare, Truck } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = 'connected' | 'disconnected' | 'failed' | 'loading'

interface Connection {
  provider: string
  status: string
  shop_domain?: string
  ad_account_id?: string
  last_sync_at?: string
}

// ─── Brand Icons ─────────────────────────────────────────────────────────────

function ShopifyIcon() {
  return (
    <svg viewBox="0 0 109 124" className="w-6 h-6" fill="none">
      <path d="M74.7 14.8s-1.4.4-3.7 1.1c-.4-1.3-1-2.8-1.8-4.4-2.7-5.1-6.6-7.8-11.3-7.8-.3-.4-.7-.8-1-1.1C55.2 1 52.9 0 50.2 0c-5.3 0-10.5 4-14.8 10.8-3 4.7-5.3 10.6-5.9 15.2l-10.2 3.1C16 30.5 15.9 30.6 15.6 34L9 88.6 61.2 98 92 91.1 74.7 14.8z" fill="#95BF47"/>
      <path d="M71 15.9c-.3 0-3.7 1.1-3.7 1.1s-2.4-8.4-8.9-8.7V8C52.8 8 49.4 12 46.8 17.6L36 21c-3.3 1-3.4 1.1-3.8 4.2l-6.5 50.5 35 6.5 30.7-7.4L71 15.9z" fill="#5E8E3E"/>
    </svg>
  )
}

function MetaIcon() {
  return (
    <svg viewBox="0 0 36 36" className="w-6 h-6" fill="none">
      <path d="M5 19.5C5 23 6.5 25 9 25s3.5-1.5 5-5.5c1-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5v.5c0 3 1.5 5 4.5 5s4.5-2 4.5-5.5v-3C32 10 27.5 5 21 5c-5.5 0-9 3-11.5 8C8 16 6.5 18 5 18v1.5z" fill="url(#mf)"/>
      <defs><linearGradient id="mf" x1="5" y1="5" x2="32" y2="25" gradientUnits="userSpaceOnUse"><stop stopColor="#0082FB"/><stop offset="1" stopColor="#00B2FF"/></linearGradient></defs>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function CourierBadge({ name }: { name: string }) {
  const colors: Record<string, string> = { Trax: '#e63946', Leopards: '#f4a261', 'Call Courier': '#2a9d8f', PostEx: '#457b9d', TCS: '#e76f51', Swyft: '#6a4c93' }
  const color = colors[name] || '#6b7280'
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>
      {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status | string }) {
  if (status === 'connected') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
      <CheckCircle className="w-3 h-3" /> Connected
    </span>
  )
  if (status === 'failed') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      <XCircle className="w-3 h-3" /> Connection Failed
    </span>
  )
  if (status === 'loading') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
      <Loader2 className="w-3 h-3 animate-spin" /> Connecting…
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
      Not Connected
    </span>
  )
}

// ─── OAuth Integration Card ───────────────────────────────────────────────────

interface OAuthCardProps {
  provider: string
  name: string
  tagline: string
  icon: React.ReactNode
  color: string
  connection?: Connection
  onConnect: () => void
  onDisconnect: () => void
  onSync: () => void
  syncing: boolean
  extra?: React.ReactNode
}

function OAuthCard({ provider, name, tagline, icon, color, connection, onConnect, onDisconnect, onSync, syncing, extra }: OAuthCardProps) {
  const isConnected = connection?.status === 'connected'
  const isFailed = connection?.status === 'failed'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-4 p-5 ${color}`}>
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{name}</span>
            <StatusBadge status={isConnected ? 'connected' : isFailed ? 'failed' : 'disconnected'} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{tagline}</p>
        </div>
      </div>

      {/* Connected detail */}
      {isConnected && connection && (
        <div className="px-5 py-3 bg-green-50 border-b border-green-100 text-xs text-green-700 flex items-center justify-between">
          <span>
            {connection.shop_domain && <span className="font-mono">{connection.shop_domain}</span>}
            {connection.ad_account_id && <span className="ml-1">· Ad Account {connection.ad_account_id}</span>}
          </span>
          {connection.last_sync_at && (
            <span className="text-green-500">Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}</span>
          )}
        </div>
      )}

      {/* Failed detail */}
      {isFailed && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Connection failed. Please reconnect to restore data sync.
        </div>
      )}

      {/* Extra (e.g. shop domain input for Shopify) */}
      {!isConnected && extra && <div className="px-5 pt-4">{extra}</div>}

      {/* Actions */}
      <div className="flex items-center gap-2 p-5 pt-4">
        {isConnected ? (
          <>
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl px-5 py-2.5 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: provider === 'shopify' ? '#5e8e3e' : provider === 'meta' ? '#1877F2' : provider === 'google' ? '#4285F4' : '#111' }}
          >
            {isFailed ? 'Reconnect' : `Connect ${name}`}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Courier Card (API key — no OAuth available) ──────────────────────────────

const COURIER_FIELDS: Record<string, { label: string; key: string; placeholder: string }[]> = {
  trax: [{ label: 'API Key', key: 'trax_api_key', placeholder: 'Your Trax API key' }],
  leopards: [
    { label: 'API Key', key: 'leopards_api_key', placeholder: 'Your Leopards API key' },
    { label: 'API Password', key: 'leopards_api_password', placeholder: 'Your Leopards API password' },
  ],
  callcourier: [
    { label: 'Login ID', key: 'callcourier_login_id', placeholder: 'Your Call Courier login ID' },
    { label: 'Password', key: 'callcourier_password', placeholder: 'Your Call Courier password' },
  ],
  postex: [{ label: 'API Token', key: 'postex_api_token', placeholder: 'Your PostEx API token' }],
  tcs: [
    { label: 'API Key', key: 'tcs_api_key', placeholder: 'Your TCS API key' },
    { label: 'Account No', key: 'tcs_account_no', placeholder: 'Your TCS account number' },
  ],
  swyft: [{ label: 'API Key', key: 'swyft_api_key', placeholder: 'Your Swyft API key' }],
}

function CourierCard({ id, name }: { id: string; name: string }) {
  const fields = COURIER_FIELDS[id] || []
  const [values, setValues] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored: Record<string, string> = {}
    let hasSaved = false
    fields.forEach((f) => {
      const v = localStorage.getItem(`fwgr_${f.key}`) || ''
      stored[f.key] = v
      if (v) hasSaved = true
    })
    setValues(stored)
    setSaved(hasSaved)
  }, [id])

  function handleSave() {
    fields.forEach((f) => {
      if (values[f.key]?.trim()) localStorage.setItem(`fwgr_${f.key}`, values[f.key].trim())
      else localStorage.removeItem(`fwgr_${f.key}`)
    })
    setSaved(fields.some((f) => !!values[f.key]?.trim()))
    setOpen(false)
    toast.success(`${name} connected`)
  }

  function handleDisconnect() {
    fields.forEach((f) => localStorage.removeItem(`fwgr_${f.key}`))
    setValues({})
    setSaved(false)
    toast.success(`${name} disconnected`)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <CourierBadge name={name} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</span>
            <StatusBadge status={saved ? 'connected' : 'disconnected'} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Sync shipments & COD payment slips</p>
        </div>
        {saved ? (
          <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 transition-colors">
            Disconnect
          </button>
        ) : (
          <button onClick={() => setOpen(!open)} className="text-xs font-medium text-white bg-gray-800 dark:bg-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-700 transition-colors">
            {open ? 'Cancel' : 'Connect'}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {name} does not support one-click login. Enter your API credentials from the {name} portal.
          </p>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">{f.label}</label>
              <input
                type="password"
                value={values[f.key] || ''}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          ))}
          <button onClick={handleSave} className="w-full h-9 text-xs font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity">
            Save & Connect
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [shopInput, setShopInput] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const notifiedRef = useRef(false)

  // Load connection status from server
  async function loadStatus() {
    try {
      const res = await fetch('/api/oauth/status')
      if (res.ok) {
        const { connections: data } = await res.json()
        setConnections(data || [])
        setLoggedIn(true)
      }
    } catch {}
  }

  useEffect(() => {
    loadStatus()

    // Show success/error toast from OAuth redirect
    if (notifiedRef.current) return
    notifiedRef.current = true
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected) {
      const names: Record<string, string> = { shopify: 'Shopify', google: 'Google', meta: 'Meta Ads' }
      toast.success(`${names[connected] || connected} connected successfully! Syncing data…`)
      window.history.replaceState({}, '', '/integrations')
      loadStatus()
    }
    if (error) {
      toast.error(decodeURIComponent(error))
      window.history.replaceState({}, '', '/integrations')
    }
  }, [])

  function getConn(provider: string) {
    return connections.find((c) => c.provider === provider)
  }

  function startOAuth(path: string) {
    window.location.href = path
  }

  async function disconnect(provider: string) {
    try {
      await fetch('/api/oauth/status', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) })
      toast.success('Disconnected')
      loadStatus()
    } catch { toast.error('Failed to disconnect') }
  }

  async function syncNow(provider: string) {
    setSyncing((s) => ({ ...s, [provider]: true }))
    try {
      await fetch(`/api/integrations/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) })
      toast.success('Sync started')
      setTimeout(loadStatus, 3000)
    } catch { toast.error('Sync failed') }
    setSyncing((s) => ({ ...s, [provider]: false }))
  }

  const connectedCount = connections.filter((c) => c.status === 'connected').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">Click Connect — log in on the official platform — come back connected. No copy-pasting tokens.</p>
          {connectedCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1 font-medium">
              <CheckCircle className="w-3 h-3" /> {connectedCount} integration{connectedCount !== 1 ? 's' : ''} connected
            </div>
          )}
          {!loggedIn && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You need to <a href="/login" className="underline font-medium">sign in</a> before connecting integrations. Tokens are stored securely to your account.</span>
            </div>
          )}
        </div>

        {/* ── eCommerce ── */}
        <Section icon={<Store className="w-4 h-4" />} title="eCommerce" description="Connect your store to sync orders, products, inventory, and analytics.">
          <OAuthCard
            provider="shopify"
            name="Shopify"
            tagline="Orders, products, inventory & store analytics"
            icon={<ShopifyIcon />}
            color="bg-[#f0f9eb]"
            connection={getConn('shopify')}
            onConnect={() => {
              const shop = shopInput.trim()
              if (!shop) { toast.error('Enter your store domain first'); return }
              startOAuth(`/api/oauth/shopify?shop=${encodeURIComponent(shop)}`)
            }}
            onDisconnect={() => disconnect('shopify')}
            onSync={() => syncNow('shopify')}
            syncing={!!syncing.shopify}
            extra={
              getConn('shopify')?.status !== 'connected' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Your Shopify store domain</label>
                  <input
                    value={shopInput}
                    onChange={(e) => setShopInput(e.target.value)}
                    placeholder="yourstore.myshopify.com"
                    className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Then click Connect — you'll log in on Shopify and choose what to allow.</p>
                </div>
              )
            }
          />
        </Section>

        {/* ── Advertising ── */}
        <Section icon={<Target className="w-4 h-4" />} title="Advertising" description="Connect your ad accounts to pull spend, ROAS, and campaign results.">
          <OAuthCard
            provider="meta"
            name="Meta Ads"
            tagline="Facebook & Instagram ad spend, ROAS & campaigns"
            icon={<MetaIcon />}
            color="bg-[#eff6ff]"
            connection={getConn('meta')}
            onConnect={() => startOAuth('/api/oauth/meta')}
            onDisconnect={() => disconnect('meta')}
            onSync={() => syncNow('meta')}
            syncing={!!syncing.meta}
          />
        </Section>

        {/* ── Analytics ── */}
        <Section icon={<BarChart3 className="w-4 h-4" />} title="Analytics" description="Connect Google to get real sessions, bounce rates, and traffic data.">
          <OAuthCard
            provider="google"
            name="Google Analytics & Search Console"
            tagline="Real sessions, bounce rate, search impressions & clicks"
            icon={<GoogleIcon />}
            color="bg-[#fef9c3]"
            connection={getConn('google')}
            onConnect={() => startOAuth('/api/oauth/google')}
            onDisconnect={() => disconnect('google')}
            onSync={() => syncNow('google')}
            syncing={!!syncing.google}
          />
        </Section>

        {/* ── Couriers ── */}
        <Section icon={<Truck className="w-4 h-4" />} title="Courier Accounts" description="Pakistani couriers don't support one-click login yet — enter your portal API key below.">
          <div className="space-y-3">
            {[
              { id: 'trax', name: 'Trax' },
              { id: 'leopards', name: 'Leopards' },
              { id: 'callcourier', name: 'Call Courier' },
              { id: 'postex', name: 'PostEx' },
              { id: 'tcs', name: 'TCS' },
              { id: 'swyft', name: 'Swyft' },
            ].map((c) => <CourierCard key={c.id} id={c.id} name={c.name} />)}
          </div>
        </Section>

        {/* Info footer */}
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Your data stays secure</p>
          <p className="text-xs text-gray-400">
            OAuth tokens are stored encrypted in your account — never in your browser. If you log out or clear your browser, your connections stay active.
            Courier API keys (localStorage only) will need to be re-entered if you clear your browser.
          </p>
        </div>

      </div>
    </div>
  )
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      </div>
      <p className="text-xs text-gray-400 mb-3 ml-6">{description}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
