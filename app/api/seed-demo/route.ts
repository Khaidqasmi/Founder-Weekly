import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { demoOrders, demoAds, demoLeads, demoInventory, demoActions } from '@/lib/demo-data'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspace_id } = await request.json()
  if (!workspace_id) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Only seed once — repeated calls must not flood the workspace with duplicate rows
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace_id)

  if (count && count > 0) {
    return NextResponse.json({ success: true, skipped: 'Workspace already has data' })
  }

  await supabase.from('orders').insert(
    demoOrders.map((o) => ({ ...o, workspace_id }))
  )
  await supabase.from('ads').insert(
    demoAds.map((a) => ({ ...a, workspace_id }))
  )
  await supabase.from('leads').insert(
    demoLeads.map((l) => ({ ...l, workspace_id }))
  )
  await supabase.from('inventory').insert(
    demoInventory.map((i) => ({ ...i, workspace_id }))
  )
  await supabase.from('action_items').insert(
    demoActions.map((a) => ({ ...a, workspace_id }))
  )

  return NextResponse.json({ success: true })
}
