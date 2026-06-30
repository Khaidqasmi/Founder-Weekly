import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

const VALID_PROVIDERS = new Set(['shopify', 'meta', 'google'])

type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
}

async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error && error.message === 'Auth session missing!') return null
  if (error) throw error
  return user as SupabaseUser | null
}

function getUserDefaults(user: SupabaseUser) {
  const email = user.email || ''
  const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'Founder'

  return { email, fullName }
}

async function getOrCreateWorkspace(admin: any, user: SupabaseUser) {
  const { email, fullName } = getUserDefaults(user)

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      email,
      role: 'user',
    }, { onConflict: 'id' })

  if (profileError) throw profileError

  const { data: existingMember, error: memberError } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) throw memberError
  if (existingMember) return existingMember

  const { data: existingWorkspace, error: existingWorkspaceError } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existingWorkspaceError) throw existingWorkspaceError

  let workspaceId = existingWorkspace?.id

  if (!workspaceId) {
    const { data: workspace, error: workspaceError } = await admin
      .from('workspaces')
      .insert({
        owner_id: user.id,
        business_name: `${fullName}'s Workspace`,
        report_email: email,
      })
      .select('id')
      .single()

    if (workspaceError) throw workspaceError
    workspaceId = workspace.id
  }

  const { error: createMemberError } = await admin
    .from('workspace_members')
    .upsert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: 'owner',
    }, { onConflict: 'workspace_id,user_id' })

  if (createMemberError) throw createMemberError
  return { workspace_id: workspaceId }
}

function buildConnectionRecord(workspaceId: string, provider: string, credentials: Record<string, string>) {
  return {
    workspace_id: workspaceId,
    provider,
    status: 'connected',
    access_token_encrypted: cleanValue(credentials.access_token || credentials.api_key),
    refresh_token_encrypted: cleanValue(credentials.api_secret || credentials.api_password),
    shop_domain: normalizeShopifyDomain(credentials.shop_domain || ''),
    ad_account_id: cleanValue(credentials.ad_account_id),
    ga4_property_id: cleanValue(credentials.property_id || credentials.ga4_property_id),
  }
}

function cleanValue(value?: string) {
  return (value || '').trim()
}

function normalizeShopifyDomain(input: string) {
  const trimmed = cleanValue(input)
  if (!trimmed) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (parsed.hostname.toLowerCase() === 'admin.shopify.com') {
      const storeHandle = parsed.pathname.split('/').filter(Boolean).at(1)
      return storeHandle ? `${storeHandle}.myshopify.com`.toLowerCase() : ''
    }

    return ensureShopifyHostname(parsed.hostname)
  } catch {
    const hostname = trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase()

    return ensureShopifyHostname(hostname)
  }
}

function ensureShopifyHostname(hostname: string) {
  const clean = hostname.replace(/^www\./i, '').toLowerCase()
  if (!clean) return ''
  return clean.includes('.') ? clean : `${clean}.myshopify.com`
}

async function validateShopifyCredentials(shopDomain: string, accessToken: string) {
  if (!shopDomain || !accessToken) {
    return 'Enter your Shopify store domain and either a Dev Dashboard Client ID, or an Admin API access token.'
  }

  try {
    const res = await fetchShopifyShop(shopDomain, accessToken)

    if (res.ok) return null

    const body = await res.text().catch(() => '')

    if (res.status === 401) {
      return 'Shopify rejected this token. Use the Admin API access token from the same store, not the API key, API secret, or Storefront token.'
    }

    if (res.status === 403) {
      return 'Shopify accepted the token but blocked access. Add Admin API scopes such as read_orders, read_products, and read_inventory, then reinstall/save the token.'
    }

    return `Shopify validation failed: ${res.status} ${body.slice(0, 200) || res.statusText}`
  } catch (error: any) {
    const reason = error?.cause?.message || error?.message || 'network request failed'
    return `Could not reach Shopify store: ${reason}`
  }
}

async function validateShopifyDevDashboardCredentials(shopDomain: string, clientId: string, clientSecret: string) {
  if (!shopDomain || !clientId || !clientSecret) {
    return 'Enter your Shopify store domain, Client ID, and Client secret.'
  }

  try {
    const token = await getShopifyClientCredentialsToken(shopDomain, clientId, clientSecret)
    const res = await fetchShopifyShop(shopDomain, token)

    if (res.ok) return null

    const body = await res.text().catch(() => '')
    return `Shopify token validation failed: ${res.status} ${body.slice(0, 200) || res.statusText}`
  } catch (error: any) {
    return error?.message || 'Could not validate Shopify credentials.'
  }
}

async function getShopifyClientCredentialsToken(shopDomain: string, clientId: string, clientSecret: string) {
  const tokenRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  const tokenData = await tokenRes.json().catch(() => ({}))

  if (!tokenRes.ok || !tokenData.access_token) {
    const message = tokenData.error_description || tokenData.error || tokenRes.statusText
    throw new Error(`Shopify could not generate an access token: ${message}`)
  }

  return tokenData.access_token as string
}

function fetchShopifyShop(shopDomain: string, accessToken: string) {
  return fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })
}

function handleRouteError(error: unknown, fallback: string) {
  console.error(`[integrations/keys] ${fallback}`, error)

  const message = error instanceof Error ? error.message : fallback
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in before connecting integrations.' }, { status: 401 })
    }

    const admin = createServiceRoleClient()
    const member = await getOrCreateWorkspace(admin, user)

    const { data: connections, error } = await admin
      .from('integration_connections')
      .select('provider, status, shop_domain, ad_account_id, ga4_property_id, last_sync_at')
      .eq('workspace_id', member.workspace_id)

    if (error) throw error

    return NextResponse.json({ connections: connections || [] })
  } catch (error) {
    return handleRouteError(error, 'Failed to load integration credentials')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in before connecting integrations.' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, credentials } = body

    if (!provider || !credentials) {
      return NextResponse.json({ error: 'Missing provider or credentials' }, { status: 400 })
    }

    if (!VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Unsupported integration provider' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const member = await getOrCreateWorkspace(admin, user)
    const record = buildConnectionRecord(member.workspace_id, provider, credentials)

    if (provider === 'shopify') {
      const validationError = record.refresh_token_encrypted
        ? await validateShopifyDevDashboardCredentials(record.shop_domain, record.access_token_encrypted, record.refresh_token_encrypted)
        : await validateShopifyCredentials(record.shop_domain, record.access_token_encrypted)

      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
    }

    const { error } = await admin
      .from('integration_connections')
      .upsert(record, { onConflict: 'workspace_id,provider' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error, 'Failed to save integration credentials')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in before changing integrations.' }, { status: 401 })
    }

    const { provider } = await request.json()
    if (!provider || !VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Unsupported integration provider' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const member = await getOrCreateWorkspace(admin, user)

    const { error } = await admin
      .from('integration_connections')
      .update({
        status: 'disconnected',
        access_token_encrypted: '',
        refresh_token_encrypted: '',
      })
      .eq('workspace_id', member.workspace_id)
      .eq('provider', provider)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error, 'Failed to remove integration credentials')
  }
}
