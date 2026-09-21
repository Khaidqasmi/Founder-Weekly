import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { purgeProviderTemporaryData } from '@/lib/temporary-data'

function validHmac(rawBody: string, provided: string) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET || ''
  if (!secret || !provided) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  const left = Buffer.from(provided, 'utf8')
  const right = Buffer.from(expected, 'utf8')
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256') || ''
  if (!validHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Invalid Shopify webhook signature' }, { status: 401 })
  }

  const topic = request.headers.get('x-shopify-topic') || ''
  const shopDomain = (request.headers.get('x-shopify-shop-domain') || '').toLowerCase()
  const payload = JSON.parse(rawBody || '{}')
  const admin = createServiceRoleClient()
  const { data: connection } = await admin
    .from('integration_connections')
    .select('id, workspace_id')
    .eq('provider', 'shopify')
    .eq('shop_domain', shopDomain)
    .maybeSingle()

  // Shopify retries non-2xx responses. A store can send a delayed compliance
  // webhook after its connection row has already been removed, so acknowledge it.
  if (!connection) return NextResponse.json({ received: true })

  if (topic === 'customers/data_request') {
    await admin.from('privacy_requests').insert({
      workspace_id: connection.workspace_id,
      provider: 'shopify',
      request_type: topic,
      external_customer_id: String(payload?.customer?.id || ''),
    })
  } else if (topic === 'customers/redact') {
    const customerId = String(payload?.customer?.id || '')
    if (customerId) {
      await admin
        .from('orders')
        .update({ customer_name: '', city: '', shopify_customer_id: '' })
        .eq('workspace_id', connection.workspace_id)
        .eq('source', 'shopify')
        .eq('shopify_customer_id', customerId)
    }
    await admin.from('privacy_requests').insert({
      workspace_id: connection.workspace_id,
      provider: 'shopify',
      request_type: topic,
      external_customer_id: customerId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
  } else if (topic === 'shop/redact') {
    await purgeProviderTemporaryData(admin, connection.workspace_id, 'shopify')
    await admin.from('integration_connections').delete().eq('id', connection.id)
  } else if (topic === 'app/uninstalled') {
    await admin
      .from('integration_connections')
      .update({ status: 'disconnected', access_token_encrypted: '', refresh_token_encrypted: '' })
      .eq('id', connection.id)
  }

  return NextResponse.json({ received: true })
}
