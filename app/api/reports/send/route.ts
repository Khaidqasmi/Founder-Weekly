import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildReportEmail } from '@/lib/email/template'
import { Resend } from 'resend'
import type { Report } from '@/lib/types'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { report_id } = await request.json()
  if (!report_id) return NextResponse.json({ error: 'Missing report_id' }, { status: 400 })

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', report_id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', report.workspace_id)
    .single()

  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const emailTo = workspace.report_email || user.email || ''
  if (!emailTo) return NextResponse.json({ error: 'No report email configured' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!apiKey || !emailFrom) {
    await supabase.from('report_email_logs').insert({
      workspace_id: report.workspace_id,
      report_id,
      email_to: emailTo,
      status: 'failed',
      error_message: 'Email service not configured. Set RESEND_API_KEY and EMAIL_FROM.',
    })
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const resend = new Resend(apiKey)
  const html = buildReportEmail(report as Report, workspace.business_name, appUrl)
  const subject = `${workspace.business_name} Weekly Growth Report, ${report.week_start} to ${report.week_end}`

  try {
    await resend.emails.send({ from: emailFrom, to: emailTo, subject, html })

    await supabase.from('report_email_logs').insert({
      workspace_id: report.workspace_id,
      report_id,
      email_to: emailTo,
      status: 'sent',
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    await supabase.from('report_email_logs').insert({
      workspace_id: report.workspace_id,
      report_id,
      email_to: emailTo,
      status: 'failed',
      error_message: err.message,
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
