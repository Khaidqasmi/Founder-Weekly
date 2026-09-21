'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { notify } from '@/lib/notifications'
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Store,
  Target,
  Truck,
  Unplug,
} from 'lucide-react'

type Status = 'connected' | 'disconnected' | 'loading'

interface Connection {
  provider: string
  status: string
  shop_domain?: string
  ad_account_id?: string
  ga4_property_id?: string
  last_sync_at?: string
}

interface OAuthAvailability {
  shopify: boolean
  meta: boolean
  google: boolean
  shopifyInstallUrl?: string
}

interface AccountOption {
  id: string
  name: string
}

interface CredentialField {
  label: string
  key: string
  placeholder: string
  type?: 'text' | 'password'
}

function StatusBadge({ status }: { status: Status | string }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 border border-green-500/25 rounded-full px-2 py-0.5">
        <CheckCircle className="w-3 h-3" /> Connected
      </span>
    )
  }

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-500/10 border border-blue-500/25 rounded-full px-2 py-0.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6d64b8] bg-[#f4f0fd] rounded-full px-2 py-0.5">
      Not Connected
    </span>
  )
}

function BrandMark({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    shopify: '#5e8e3e',
    meta: '#1877F2',
    google: '#4285F4',
  }
  const letters: Record<string, string> = {
    shopify: 'S',
    meta: 'M',
    google: 'G',
  }

  return (
    <div
      className="w-12 h-12 rounded-xl shadow-sm flex items-center justify-center text-white text-lg font-bold shrink-0"
      style={{ background: colors[provider] || '#111827' }}
    >
      {letters[provider] || provider.slice(0, 1).toUpperCase()}
    </div>
  )
}

function detailFor(connection?: Connection) {
  if (!connection) return ''
  if (connection.shop_domain) return connection.shop_domain
  if (connection.ad_account_id) return `Ad Account ${connection.ad_account_id}`
  if (connection.ga4_property_id) return `GA4 Property ${connection.ga4_property_id}`
  return ''
}

function IntegrationCard({
  provider,
  name,
  tagline,
  color,
  connection,
  onDisconnect,
  onSync,
  syncing,
  syncEnabled = true,
  embeddedRedirectUrl,
  quickConnect,
}: {
  provider: string
  name: string
  tagline: string
  color: string
  connection?: Connection
  onDisconnect: () => void
  onSync: () => void
  syncing: boolean
  syncEnabled?: boolean
  embeddedRedirectUrl?: string
  quickConnect?: React.ReactNode
}) {
  const isConnected = connection?.status === 'connected'
  const detail = detailFor(connection)

  return (
    <div className="bg-white rounded-2xl border border-[#e4defa] overflow-hidden">
      <div className={`flex items-center gap-4 p-5 ${color}`}>
        <BrandMark provider={provider} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#312b63] text-sm">{name}</span>
            <StatusBadge status={isConnected ? 'connected' : 'disconnected'} />
          </div>
          <p className="text-xs text-[#6d64b8] mt-0.5">{tagline}</p>
        </div>
      </div>

      {isConnected && (
        <div className="px-5 py-3 bg-green-500/10 border-b border-green-500/20 text-xs text-green-600 flex items-center justify-between gap-3">
          <span className="font-mono min-w-0 truncate">{detail || 'Connected'}</span>
          {connection?.last_sync_at && (
            <span className="text-green-500 shrink-0">
              Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {!isConnected && !embeddedRedirectUrl && quickConnect && (
        <div className="px-5 pt-4">{quickConnect}</div>
      )}

      {!isConnected && !embeddedRedirectUrl && !quickConnect && (
        <div className="px-5 pt-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
            Ecom Panel ka secure connection setup final review mein hai. Client ko API key ya developer app banane ki zaroorat nahi hogi.
          </div>
        </div>
      )}

      {!isConnected && embeddedRedirectUrl && (
        <div className="px-5 pt-4 pb-1 space-y-2">
          <div className="flex items-start gap-2 bg-[#fce7f3] border border-[#f8cfe4] rounded-lg px-3 py-2.5 text-xs text-[#db2777]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Secure sign-in ko complete karne ke liye Ecom Panel ko new tab mein kholein.
            </span>
          </div>
          <a
            href={embeddedRedirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-white rounded-xl px-5 py-2.5 transition-all hover:opacity-90"
            style={{ background: '#5e8e3e' }}
          >
            Open Ecom Panel to Continue
            <ChevronRight className="w-4 h-4" />
          </a>
          <p className="text-xs text-[#8d87b8] text-center pb-1">
            Sign in if prompted; kisi API key ko copy karne ki zaroorat nahi hai.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 p-5 pt-4">
        {isConnected ? (
          <>
            {syncEnabled && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex items-center gap-1.5 text-xs font-medium text-[#6d64b8] border border-[#e4defa] rounded-lg px-3 py-2 hover:border-[#e4defa] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 text-xs font-medium text-red-400 border border-red-500/25 rounded-lg px-3 py-2 hover:bg-red-500/10 transition-colors"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

const COURIER_FIELDS: Record<string, CredentialField[]> = {
  trax: [{ label: 'API Key', key: 'trax_api_key', placeholder: 'Your Trax API key', type: 'password' }],
  leopards: [
    { label: 'API Key', key: 'leopards_api_key', placeholder: 'Your Leopards API key', type: 'password' },
    { label: 'API Password', key: 'leopards_api_password', placeholder: 'Your Leopards API password', type: 'password' },
  ],
  callcourier: [
    { label: 'Login ID', key: 'callcourier_login_id', placeholder: 'Your Call Courier login ID' },
    { label: 'Password', key: 'callcourier_password', placeholder: 'Your Call Courier password', type: 'password' },
  ],
  postex: [{ label: 'API Token', key: 'postex_api_token', placeholder: 'Your PostEx API token', type: 'password' }],
  tcs: [
    { label: 'API Key', key: 'tcs_api_key', placeholder: 'Your TCS API key', type: 'password' },
    { label: 'Account No', key: 'tcs_account_no', placeholder: 'Your TCS account number' },
  ],
  swyft: [{ label: 'API Key', key: 'swyft_api_key', placeholder: 'Your Swyft API key', type: 'password' }],
}

function CourierCard({ id, name }: { id: string; name: string }) {
  const fields = COURIER_FIELDS[id] || []
  const [values, setValues] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored: Record<string, string> = {}
    let hasSaved = false
    fields.forEach((field) => {
      const value = localStorage.getItem(`fwgr_${field.key}`) || ''
      stored[field.key] = value
      if (value) hasSaved = true
    })
    setValues(stored)
    setSaved(hasSaved)
  }, [fields])

  function handleSave() {
    fields.forEach((field) => {
      const value = values[field.key]?.trim()
      if (value) localStorage.setItem(`fwgr_${field.key}`, value)
      else localStorage.removeItem(`fwgr_${field.key}`)
    })
    setSaved(fields.some((field) => !!values[field.key]?.trim()))
    setOpen(false)
    toast.success(`${name} connected`)
  }

  function handleDisconnect() {
    fields.forEach((field) => localStorage.removeItem(`fwgr_${field.key}`))
    setValues({})
    setSaved(false)
    toast.success(`${name} disconnected`)
  }

  return (
    <div className="bg-white rounded-xl border border-[#e4defa] p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gradient-to-br from-[#8b5cf6] to-[#ec4899]">
          {name.split(' ').map((word) => word[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#312b63]">{name}</span>
            <StatusBadge status={saved ? 'connected' : 'disconnected'} />
          </div>
          <p className="text-xs text-[#8d87b8] mt-0.5">Sync shipments and COD payment slips</p>
        </div>
        {saved ? (
          <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-600 border border-red-500/25 rounded-lg px-2.5 py-1.5 transition-colors">
            Disconnect
          </button>
        ) : (
          <button onClick={() => setOpen(!open)} className="text-xs font-semibold text-white bg-gradient-to-r from-[#ec4899] to-[#a855f7] rounded-full px-3.5 py-1.5 shadow-[0_4px_14px_rgba(236,72,153,0.35)] hover:opacity-90 transition-opacity">
            {open ? 'Cancel' : 'Connect'}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3 pt-4 border-t border-[#f0ecfb]">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-[#6d64b8] block mb-1">{field.label}</label>
              <input
                type={field.type || 'text'}
                value={values[field.key] || ''}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                placeholder={field.placeholder}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#e4defa] bg-[#f5f3fb] focus:outline-none focus:ring-2 focus:ring-[#ec4899]/30"
              />
            </div>
          ))}
          <button onClick={handleSave} className="w-full h-9 text-xs font-semibold text-black bg-[#ec4899] hover:opacity-90 rounded-lg hover:opacity-90 transition-opacity">
            Save & Connect
          </button>
        </div>
      )}
    </div>
  )
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#8d87b8]">{icon}</span>
        <h2 className="text-sm font-semibold text-[#312b63]">{title}</h2>
      </div>
      <p className="text-xs text-[#8d87b8] mb-3 ml-6">{description}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function providerName(provider: string) {
  const names: Record<string, string> = {
    shopify: 'Shopify',
    meta: 'Meta Ads',
    google: 'Google Analytics',
  }
  return names[provider] || provider
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [loggedIn, setLoggedIn] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [oauthAvailable, setOauthAvailable] = useState<OAuthAvailability>({ shopify: false, meta: false, google: false })
  const [selectionProvider, setSelectionProvider] = useState<'meta' | 'google' | null>(null)
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [savingSelection, setSavingSelection] = useState(false)
  // Read synchronously so IntegrationCard receives the correct initialValues on its first render.
  // useEffect runs after mount, which is too late for useState lazy initialisers inside the card.
  const [shopParam] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('shop') || ''
  })

  async function loadStatus() {
    try {
      const res = await fetch('/api/oauth/status')
      if (res.status === 401) {
        setConnections([])
        setLoggedIn(false)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])
        setOauthAvailable(data.oauth || { shopify: false, meta: false, google: false })
        // authenticated field: false means no Supabase session; missing/true means signed in
        setLoggedIn(data.authenticated !== false)
      }
    } catch {
      setConnections([])
    }
  }

  useEffect(() => {
    loadStatus()

    // Detect Shopify embedded iframe context.
    // Supabase auth cookies use SameSite=Lax which blocks them in cross-origin iframes,
    // so credential saves will always fail when embedded inside Shopify Admin.
    const inIframe = typeof window !== 'undefined' && window.self !== window.top
    const params = new URLSearchParams(window.location.search)

    // Shopify passes `shop` (and optionally `host`, `embedded=1`) to embedded apps.
    // Only treat as embedded if inside an actual iframe or Shopify signals it via `embedded=1`.
    // The `shop` param alone is used for pre-fill when the user opens the top-level redirect link.
    const isShopifyEmbed = inIframe || params.get('embedded') === '1'

    setIsEmbedded(isShopifyEmbed)

    const error = params.get('error')
    const connected = params.get('connected')
    const selectProvider = params.get('select')
    const autoSync = params.get('autosync')
    if (error) {
      toast.error(decodeURIComponent(error))
      window.history.replaceState({}, '', '/integrations')
    } else if (connected) {
      toast.success(`${providerName(connected)} connected successfully`)
      window.history.replaceState({}, '', '/integrations')
      loadStatus().then(() => {
        if (autoSync === 'shopify' || autoSync === 'meta') syncNow(autoSync)
      })
    } else if (selectProvider === 'meta' || selectProvider === 'google') {
      setSelectionProvider(selectProvider)
      loadAccountOptions(selectProvider)
    }
  }, [])

  async function loadAccountOptions(provider: 'meta' | 'google') {
    setLoadingOptions(true)
    try {
      const response = await fetch(`/api/oauth/options?provider=${provider}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Accounts could not be loaded')
      const options = data.options || []
      setAccountOptions(options)
      setSelectedAccountId(options[0]?.id || '')
    } catch (error: any) {
      toast.error(error.message || 'Accounts could not be loaded')
    } finally {
      setLoadingOptions(false)
    }
  }

  async function saveAccountSelection() {
    if (!selectionProvider || !selectedAccountId) return
    setSavingSelection(true)
    try {
      const response = await fetch('/api/oauth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectionProvider, selectedId: selectedAccountId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Selection could not be saved')
      const provider = selectionProvider
      setSelectionProvider(null)
      setAccountOptions([])
      window.history.replaceState({}, '', '/integrations')
      toast.success(`${providerName(provider)} connected successfully`)
      await loadStatus()
      if (provider === 'meta') await syncNow('meta')
    } catch (error: any) {
      toast.error(error.message || 'Selection could not be saved')
    } finally {
      setSavingSelection(false)
    }
  }

  function getConn(provider: string) {
    return connections.find((connection) => connection.provider === provider)
  }

  async function disconnect(provider: string) {
    try {
      const res = await fetch('/api/oauth/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect')
      toast.success('Disconnected')
      await loadStatus()
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect')
    }
  }

  async function syncNow(provider: string) {
    setSyncing((state) => ({ ...state, [provider]: true }))
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      toast.success('Sync started')
      notify({ kind: 'info', title: 'Sync started', message: `${providerName(provider)} sync is running in the background` })
      setTimeout(loadStatus, 3000)
    } catch (err: any) {
      toast.error(err.message || 'Sync failed')
      notify({ kind: 'error', title: 'Sync failed', message: `${providerName(provider)}: ${err.message || 'Sync failed'}` })
    }
    setSyncing((state) => ({ ...state, [provider]: false }))
  }

  const connectedCount = connections.filter((connection) => connection.status === 'connected').length

  // Build the top-level Founder Weekly integrations URL that escapes the iframe.
  // Only computed when embedded; uses origin so it works on any deployment host.
  const shopifyEmbeddedRedirectUrl = isEmbedded
    ? `/integrations${shopParam ? `?shop=${encodeURIComponent(shopParam)}` : ''}`
    : undefined

  return (
    <div className="min-h-screen bg-[#f5f3fb]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#312b63]">Integrations</h1>
          <p className="text-sm text-[#6d64b8] mt-1">
            Har client apne account par Connect dabaye, provider approval de, aur data us ke apne workspace mein sync ho jaye.
          </p>
          {connectedCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs bg-green-500/10 border border-green-500/25 text-green-600 rounded-full px-3 py-1 font-medium">
              <CheckCircle className="w-3 h-3" /> {connectedCount} integration{connectedCount !== 1 ? 's' : ''} connected
            </div>
          )}
          {!loggedIn && !isEmbedded && (
            <div className="mt-3 flex items-center gap-2 bg-[#fce7f3] border border-[#f8cfe4] text-[#db2777] rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                You need to{' '}
                <a href="/login" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  sign in to Founder Weekly
                </a>{' '}
                before connecting integrations.
              </span>
            </div>
          )}
          {selectionProvider && (
            <div className="mt-4 rounded-xl border border-[#d7e2fb] bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#312b63]">
                {selectionProvider === 'meta' ? 'Meta ad account' : 'Google Analytics property'} select karein
              </p>
              <p className="mt-1 text-xs text-[#6d64b8]">Multiple accounts mile hain, is liye sahi brand ek martaba choose karna zaroori hai.</p>
              {loadingOptions ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#6d64b8]"><Loader2 className="h-4 w-4 animate-spin" /> Loading accounts...</div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                    className="h-10 flex-1 rounded-lg border border-[#d7e2fb] bg-white px-3 text-sm"
                  >
                    {accountOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={saveAccountSelection}
                    disabled={!selectedAccountId || savingSelection}
                    className="h-10 rounded-lg bg-[#312b63] px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingSelection ? 'Connecting...' : 'Connect selected account'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <Section icon={<Store className="w-4 h-4" />} title="eCommerce" description="Connect your store to sync orders, products, inventory, and analytics.">
          <IntegrationCard
            provider="shopify"
            name="Shopify"
            tagline="Orders, products, inventory and store analytics"
            color="bg-[#5e8e3e]/10"
            connection={getConn('shopify')}
            embeddedRedirectUrl={shopifyEmbeddedRedirectUrl}
            quickConnect={oauthAvailable.shopify ? (
              <div className="rounded-xl border border-[#dce8d4] bg-[#f5faf2] p-3">
                <p className="mb-2 text-xs font-semibold text-[#365c25]">One-click secure install</p>
                <a
                  href={oauthAvailable.shopifyInstallUrl}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#5e8e3e] px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  Connect with Shopify <ChevronRight className="h-4 w-4" />
                </a>
                <p className="mt-2 text-[11px] text-[#5f7654]">Shopify par store choose karke read-only access approve karein. API keys ki zaroorat nahi.</p>
              </div>
            ) : undefined}
            onDisconnect={() => disconnect('shopify')}
            onSync={() => syncNow('shopify')}
            syncing={!!syncing.shopify}
          />
        </Section>

        <Section icon={<Target className="w-4 h-4" />} title="Advertising" description="Connect ad accounts to pull spend, ROAS, and campaign results.">
          <IntegrationCard
            provider="meta"
            name="Meta Ads"
            tagline="Facebook and Instagram ad spend, ROAS and campaigns"
            color="bg-[#1877F2]/10"
            connection={getConn('meta')}
            quickConnect={oauthAvailable.meta ? (
              <div className="rounded-xl border border-[#cfe0fb] bg-[#f3f7ff] p-3">
                <p className="mb-2 text-xs text-[#315b94]">Sign in to Facebook, choose access, and return here automatically.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!loggedIn) return toast.error('Sign in before connecting Meta Ads')
                    window.location.assign('/api/oauth/meta')
                  }}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  Connect with Meta <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : undefined}
            onDisconnect={() => disconnect('meta')}
            onSync={() => syncNow('meta')}
            syncing={!!syncing.meta}
          />
        </Section>

        <Section icon={<BarChart3 className="w-4 h-4" />} title="Analytics" description="Save a GA4 property and token for this workspace.">
          <IntegrationCard
            provider="google"
            name="Google Analytics"
            tagline="GA4 property credentials for reporting"
            color="bg-[#fce7f3]"
            connection={getConn('google')}
            quickConnect={oauthAvailable.google ? (
              <div className="rounded-xl border border-[#d7e2fb] bg-[#f7f9ff] p-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!loggedIn) return toast.error('Sign in before connecting Google Analytics')
                    window.location.assign('/api/oauth/google')
                  }}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#4285F4] px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  Connect with Google <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : undefined}
            onDisconnect={() => disconnect('google')}
            onSync={() => syncNow('google')}
            syncing={!!syncing.google}
            syncEnabled={false}
          />
        </Section>

        <Section icon={<Truck className="w-4 h-4" />} title="Courier Accounts" description="Enter courier portal API keys for this browser.">
          <div className="space-y-3">
            {[
              { id: 'trax', name: 'Trax' },
              { id: 'leopards', name: 'Leopards' },
              { id: 'callcourier', name: 'Call Courier' },
              { id: 'postex', name: 'PostEx' },
              { id: 'tcs', name: 'TCS' },
              { id: 'swyft', name: 'Swyft' },
            ].map((courier) => <CourierCard key={courier.id} id={courier.id} name={courier.name} />)}
          </div>
        </Section>

        <div className="mt-6 bg-white rounded-xl border border-[#e4defa] p-5">
          <p className="text-xs font-medium text-[#4a4477] mb-1">Your data stays secure</p>
          <p className="text-xs text-[#8d87b8]">
            Store and ad credentials are saved to your workspace, so they remain connected when you log back in.
            Courier API keys are currently saved in this browser and need to be re-entered if browser data is cleared.
          </p>
        </div>
      </div>
    </div>
  )
}
