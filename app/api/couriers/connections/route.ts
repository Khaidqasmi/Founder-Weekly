import { NextResponse } from 'next/server'
import { courierAccount } from '@/lib/integrations/couriers/account'
import { COURIER_PROVIDERS } from '@/lib/integrations/couriers/types'
import { encryptToken } from '@/lib/crypto'

export const dynamic = 'force-dynamic'
const fields: Record<string, string[]> = Object.fromEntries(COURIER_PROVIDERS.map(p => [p.id, p.fields.map(f => f.key)]))
fields.tcs = ['tcs_api_key', 'tcs_account_no']
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  const account = await courierAccount()
  if (!account) return NextResponse.json({ error: 'Sign in to Ecom Panel first' }, { status: 401, headers })
  const { data, error } = await account.supabase.from('integration_connections')
    .select('provider').eq('workspace_id', account.workspaceId).eq('status', 'connected').like('provider', 'courier\\_%')
  if (error) return NextResponse.json({ error: 'Could not load connections' }, { status: 500, headers })
  return NextResponse.json({ providers: (data || []).map(row => row.provider.slice(8)) }, { headers })
}

async function save(request: Request, disconnect: boolean) {
  const account = await courierAccount()
  if (!account) return NextResponse.json({ error: 'Sign in to Ecom Panel first' }, { status: 401, headers })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.provider !== 'string' || !Object.hasOwn(fields, body.provider)) {
    return NextResponse.json({ error: 'Unknown courier' }, { status: 400, headers })
  }
  const values: Record<string, string> = {}
  if (!disconnect) {
    for (const key of fields[body.provider]) {
      const value = body.credentials?.[key]
      if (typeof value !== 'string' || !value.trim() || value.length > 8192) {
        return NextResponse.json({ error: 'Fill in all courier credentials' }, { status: 400, headers })
      }
      values[key] = value.trim()
    }
    if (!process.env.TOKEN_ENCRYPTION_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Secure credential storage is unavailable' }, { status: 503, headers })
    }
  }
  const { error } = await account.supabase.from('integration_connections').upsert({
    workspace_id: account.workspaceId,
    provider: `courier_${body.provider}`,
    status: disconnect ? 'disconnected' : 'connected',
    access_token_encrypted: disconnect ? '' : encryptToken(JSON.stringify(values)),
    refresh_token_encrypted: '',
  }, { onConflict: 'workspace_id,provider' })
  if (error) return NextResponse.json({ error: 'Could not save courier connection' }, { status: 500, headers })
  return NextResponse.json({ success: true }, { headers })
}

export async function POST(request: Request) { return save(request, false) }
export async function DELETE(request: Request) { return save(request, true) }
