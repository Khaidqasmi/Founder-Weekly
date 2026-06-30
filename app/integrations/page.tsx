'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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

interface CredentialField {
  label: string
  key: string
  placeholder: string
  type?: 'text' | 'password'
}

function StatusBadge({ status }: { status: Status | string }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
        <CheckCircle className="w-3 h-3" /> Connected
      </span>
    )
  }

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
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
  fields,
  onSave,
  onDisconnect,
  onSync,
  syncing,
  syncEnabled = true,
}: {
  provider: string
  name: string
  tagline: string
  color: string
  connection?: Connection
  fields: CredentialField[]
  onSave: (credentials: Record<string, string>) => Promise<void>
  onDisconnect: () => void
  onSync: () => void
  syncing: boolean
  syncEnabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const isConnected = connection?.status === 'connected'
  const detail = detailFor(connection)

  async function handleSave() {
    const credentials: Record<string, string> = {}
    for (const field of fields) {
      const value = values[field.key]?.trim() || ''
      if (!value) {
        toast.error(`Enter ${field.label}`)
        return
      }
      credentials[field.key] = value
    }

    setSaving(true)
    try {
      await onSave(credentials)
      setValues({})
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`flex items-center gap-4 p-5 ${color}`}>
        <BrandMark provider={provider} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{name}</span>
            <StatusBadge status={isConnected ? 'connected' : 'disconnected'} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{tagline}</p>
        </div>
      </div>

      {isConnected && (
        <div className="px-5 py-3 bg-green-50 border-b border-green-100 text-xs text-green-700 flex items-center justify-between gap-3">
          <span className="font-mono min-w-0 truncate">{detail || 'Connected'}</span>
          {connection?.last_sync_at && (
            <span className="text-green-500 shrink-0">
              Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {!isConnected && open && (
        <div className="px-5 pt-4 space-y-3">
          <p className="text-xs text-gray-500">
            Paste credentials from your own {name} account. They are saved only for your workspace.
          </p>
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                {field.label}
              </label>
              <input
                type={field.type || 'text'}
                value={values[field.key] || ''}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                placeholder={field.placeholder}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 p-5 pt-4">
        {isConnected ? (
          <>
            {syncEnabled && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </>
        ) : open ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl px-5 py-2.5 transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: provider === 'shopify' ? '#5e8e3e' : provider === 'meta' ? '#1877F2' : '#4285F4' }}
            >
              {saving ? 'Saving...' : `Save & Connect ${name}`}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl px-5 py-2.5 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: provider === 'shopify' ? '#5e8e3e' : provider === 'meta' ? '#1877F2' : '#4285F4' }}
          >
            Connect {name}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gray-800">
          {name.split(' ').map((word) => word[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</span>
            <StatusBadge status={saved ? 'connected' : 'disconnected'} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Sync shipments and COD payment slips</p>
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
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">{field.label}</label>
              <input
                type={field.type || 'text'}
                value={values[field.key] || ''}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                placeholder={field.placeholder}
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

  async function loadStatus() {
    try {
      const res = await fetch('/api/oauth/status')
      if (res.status === 401) {
        setConnections([])
        setLoggedIn(false)
        return
      }
      if (res.ok) {
        const { connections: data } = await res.json()
        setConnections(data || [])
        setLoggedIn(true)
      }
    } catch {
      setConnections([])
    }
  }

  useEffect(() => {
    loadStatus()

    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      toast.error(decodeURIComponent(error))
      window.history.replaceState({}, '', '/integrations')
    }
  }, [])

  function getConn(provider: string) {
    return connections.find((connection) => connection.provider === provider)
  }

  async function saveCredentials(provider: string, credentials: Record<string, string>) {
    const res = await fetch('/api/integrations/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, credentials }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to save credentials')

    toast.success(`${providerName(provider)} connected`)
    await loadStatus()
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
      setTimeout(loadStatus, 3000)
    } catch (err: any) {
      toast.error(err.message || 'Sync failed')
    }
    setSyncing((state) => ({ ...state, [provider]: false }))
  }

  const connectedCount = connections.filter((connection) => connection.status === 'connected').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Click Connect, paste your account credentials, and save them to this workspace.
          </p>
          {connectedCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1 font-medium">
              <CheckCircle className="w-3 h-3" /> {connectedCount} integration{connectedCount !== 1 ? 's' : ''} connected
            </div>
          )}
          {!loggedIn && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You need to <a href="/login" className="underline font-medium">sign in</a> before connecting integrations.</span>
            </div>
          )}
        </div>

        <Section icon={<Store className="w-4 h-4" />} title="eCommerce" description="Connect your store to sync orders, products, inventory, and analytics.">
          <IntegrationCard
            provider="shopify"
            name="Shopify"
            tagline="Orders, products, inventory and store analytics"
            color="bg-[#f0f9eb]"
            connection={getConn('shopify')}
            fields={[
              { label: 'Store domain', key: 'shop_domain', placeholder: 'yourstore.myshopify.com' },
              { label: 'Admin API access token', key: 'access_token', placeholder: 'shpat_…  (Settings → Apps → Develop apps → your app → API credentials)', type: 'password' },
            ]}
            onSave={async (credentials) => {
              const res = await fetch('/api/integrations/shopify/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  shopDomain: credentials.shop_domain,
                  accessToken: credentials.access_token,
                }),
              })
              const data = await res.json().catch(() => ({}))
              if (!res.ok) throw new Error(data.error || 'Connection failed')
              toast.success(`Shopify connected${data.shopName ? ` — ${data.shopName}` : ''}!`)
              await loadStatus()
            }}
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
            color="bg-[#eff6ff]"
            connection={getConn('meta')}
            fields={[
              { label: 'Meta access token', key: 'access_token', placeholder: 'EAAB...', type: 'password' },
              { label: 'Ad account ID', key: 'ad_account_id', placeholder: 'act_1234567890' },
            ]}
            onSave={(credentials) => saveCredentials('meta', credentials)}
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
            color="bg-[#fef9c3]"
            connection={getConn('google')}
            fields={[
              { label: 'GA4 property ID', key: 'property_id', placeholder: '123456789' },
              { label: 'Access token', key: 'access_token', placeholder: 'ya29...', type: 'password' },
            ]}
            onSave={(credentials) => saveCredentials('google', credentials)}
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

        <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Your data stays secure</p>
          <p className="text-xs text-gray-400">
            Store and ad credentials are saved to your workspace, so they remain connected when you log back in.
            Courier API keys are currently saved in this browser and need to be re-entered if browser data is cleared.
          </p>
        </div>
      </div>
    </div>
  )
}
