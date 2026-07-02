import type { SupabaseClient } from '@supabase/supabase-js'

type Provider = 'shopify' | 'meta' | 'google' | string

export async function purgeProviderTemporaryData(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: Provider
) {
  if (!workspaceId) return

  if (provider === 'shopify') {
    await Promise.all([
      supabase.from('orders').delete().eq('workspace_id', workspaceId).eq('source', 'shopify'),
      supabase.from('inventory').delete().eq('workspace_id', workspaceId).eq('source', 'shopify'),
      supabase.from('sync_runs').delete().eq('workspace_id', workspaceId).eq('provider', 'shopify'),
    ])
    return
  }

  if (provider === 'meta') {
    await Promise.all([
      supabase.from('ads').delete().eq('workspace_id', workspaceId).eq('source', 'meta'),
      supabase.from('sync_runs').delete().eq('workspace_id', workspaceId).eq('provider', 'meta'),
    ])
    return
  }

  if (provider === 'google') {
    await supabase.from('sync_runs').delete().eq('workspace_id', workspaceId).eq('provider', 'google')
  }
}

export async function purgeAllTemporaryIntegrationData(supabase: SupabaseClient, workspaceId: string) {
  await Promise.all([
    purgeProviderTemporaryData(supabase, workspaceId, 'shopify'),
    purgeProviderTemporaryData(supabase, workspaceId, 'meta'),
    purgeProviderTemporaryData(supabase, workspaceId, 'google'),
  ])
}
