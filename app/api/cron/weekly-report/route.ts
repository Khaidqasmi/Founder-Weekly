import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateAdRevenue,
  calculateROAS, calculateCODOrders, calculateConfirmedCODOrders, calculateCODConfirmationRate,
  calculateCancelledOrders, calculateCancellationRate, calculateTopProduct, calculateWeakProduct,
  calculateLowStockProducts, calculatePendingFollowups,
} from '@/lib/calculations'
import { buildReportEmail } from '@/lib/email/template'
import { Resend } from 'resend'
import type { Report } from '@/lib/types'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const apiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data: subs } = await supabase
    .from('trial_subscriptions')
    .select('workspace_id, status')
    .in('status', ['active', 'upgraded'])

  if (!subs || subs.length === 0) {
    return NextResponse.json({ message: 'No active workspaces' })
  }

  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() - 1)
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekStart.getDate() - 6)

  const wStart = weekStart.toISOString().split('T')[0]
  const wEnd = weekEnd.toISOString().split('T')[0]

  const results: { workspace_id: string; status: string; error?: string }[] = []

  for (const sub of subs) {
    try {
      const wsId = sub.workspace_id

      const [ordersRes, adsRes, leadsRes, inventoryRes, wsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('workspace_id', wsId).gte('order_date', wStart).lte('order_date', wEnd),
        supabase.from('ads').select('*').eq('workspace_id', wsId).gte('date', wStart).lte('date', wEnd),
        supabase.from('leads').select('*').eq('workspace_id', wsId),
        supabase.from('inventory').select('*').eq('workspace_id', wsId),
        supabase.from('workspaces').select('*').eq('id', wsId).single(),
      ])

      const orders = ordersRes.data || []
      const ads = adsRes.data || []
      const leads = leadsRes.data || []
      const inventory = inventoryRes.data || []
      const workspace = wsRes.data

      const lowStock = calculateLowStockProducts(inventory)

      const report = {
        workspace_id: wsId,
        week_start: wStart,
        week_end: wEnd,
        revenue: calculateRevenue(orders),
        orders_count: calculateOrders(orders),
        aov: calculateAOV(orders),
        ad_spend: calculateAdSpend(ads),
        ad_revenue: calculateAdRevenue(ads),
        roas: calculateROAS(ads),
        cod_orders: calculateCODOrders(orders),
        confirmed_cod_orders: calculateConfirmedCODOrders(orders),
        cod_confirmation_rate: calculateCODConfirmationRate(orders),
        cancelled_orders: calculateCancelledOrders(orders),
        cancellation_rate: calculateCancellationRate(orders),
        top_product: calculateTopProduct(orders),
        weak_product: calculateWeakProduct(orders),
        low_stock_products: lowStock.map((p) => p.product_name).join(', '),
        pending_followups: calculatePendingFollowups(leads),
        summary: `Revenue: Rs ${calculateRevenue(orders).toLocaleString()}, Orders: ${orders.length}`,
      }

      const { data: saved } = await supabase.from('reports').insert(report).select().single()

      if (apiKey && emailFrom && workspace?.report_email && saved) {
        const resend = new Resend(apiKey)
        const html = buildReportEmail(saved as Report, workspace.business_name, appUrl)
        const subject = `${workspace.business_name} Weekly Growth Report, ${wStart} to ${wEnd}`

        try {
          await resend.emails.send({ from: emailFrom, to: workspace.report_email, subject, html })
          await supabase.from('report_email_logs').insert({
            workspace_id: wsId, report_id: saved.id, email_to: workspace.report_email, status: 'sent',
          })
          results.push({ workspace_id: wsId, status: 'sent' })
        } catch (emailErr: any) {
          await supabase.from('report_email_logs').insert({
            workspace_id: wsId, report_id: saved.id, email_to: workspace.report_email, status: 'failed', error_message: emailErr.message,
          })
          results.push({ workspace_id: wsId, status: 'email_failed', error: emailErr.message })
        }
      } else {
        results.push({ workspace_id: wsId, status: 'report_saved_no_email' })
      }
    } catch (err: any) {
      results.push({ workspace_id: sub.workspace_id, status: 'error', error: err.message })
    }
  }

  return NextResponse.json({ results })
}
