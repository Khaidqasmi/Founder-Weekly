import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'

export async function courierAccount() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: member, error } = await supabase.from('workspace_members')
    .select('workspace_id').eq('user_id', user.id).single()
  if (error || !member) return null
  return { supabase, workspaceId: member.workspace_id }
}

export async function courierCredentials(account: NonNullable<Awaited<ReturnType<typeof courierAccount>>>) {
  const { data, error } = await account.supabase.from('integration_connections')
    .select('provider, access_token_encrypted').eq('workspace_id', account.workspaceId)
    .eq('status', 'connected').like('provider', 'courier\\_%')
  if (error) throw new Error('Could not load courier connections')
  const credentials: Record<string, string> = {}
  for (const row of data || []) {
    const values = JSON.parse(decryptToken(row.access_token_encrypted))
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string') credentials[key] = value
    }
  }
  return credentials
}
