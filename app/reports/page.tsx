'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [wsId, setWsId] = useState('')
  const [loading, setLoading] = useState(false)
  const [weekStart, setWeekStart] = useState('')
  const [weekEnd, setWeekEnd] = useState('')
  const [selectedReport, setSelectedReport] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
          .then(({ data }) => {
            if (data) {
              setWsId(data.workspace_id)
              supabase.from('reports').select('*').eq('workspace_id', data.workspace_id)
                .order('created_at', { ascending: false })
                .then(({ data: reps }) => setReports(reps || []))
            }
          })
      }
    })
  }, [])

  async function handleGenerate() {
    if (!weekStart || !weekEnd) { toast.error('Select week start and end dates'); return }
    setLoading(true)
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: wsId, week_start: weekStart, week_end: weekEnd }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Report generated!')
      setReports([data.report, ...reports])
      setSelectedReport(data.report)
    } else {
      toast.error(data.error)
    }
    setLoading(false)
  }

  async function handleSendEmail(reportId: string) {
    const res = await fetch('/api/reports/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId }),
    })
    const data = await res.json()
    if (res.ok) toast.success('Report email sent!')
    else toast.error(data.error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Generate Report</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div><Label>Week Start</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
              <div><Label>Week End</Label><Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>
              <Button onClick={handleGenerate} disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</Button>
            </div>
          </CardContent>
        </Card>

        {selectedReport && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Report: {selectedReport.week_start} to {selectedReport.week_end}</CardTitle>
                <Button size="sm" onClick={() => handleSendEmail(selectedReport.id)}>Send Email</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-sm text-gray-500">Revenue</p><p className="font-bold">{formatCurrency(selectedReport.revenue)}</p></div>
                <div><p className="text-sm text-gray-500">Orders</p><p className="font-bold">{selectedReport.orders_count}</p></div>
                <div><p className="text-sm text-gray-500">AOV</p><p className="font-bold">{formatCurrency(selectedReport.aov)}</p></div>
                <div><p className="text-sm text-gray-500">Ad Spend</p><p className="font-bold">{formatCurrency(selectedReport.ad_spend)}</p></div>
                <div><p className="text-sm text-gray-500">ROAS</p><p className="font-bold">{selectedReport.roas?.toFixed(2)}x</p></div>
                <div><p className="text-sm text-gray-500">COD Confirmation</p><p className="font-bold">{selectedReport.cod_confirmation_rate?.toFixed(1)}%</p></div>
                <div><p className="text-sm text-gray-500">Top Product</p><p className="font-bold">{selectedReport.top_product}</p></div>
                <div><p className="text-sm text-gray-500">Weak Product</p><p className="font-bold">{selectedReport.weak_product}</p></div>
                <div><p className="text-sm text-gray-500">Low Stock</p><p className="font-bold">{selectedReport.low_stock_products || 'None'}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Report History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedReport(r)}>
                    <TableCell>{r.week_start} - {r.week_end}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                    <TableCell className="text-right">{r.orders_count}</TableCell>
                    <TableCell className="text-right">{r.roas?.toFixed(2)}x</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSendEmail(r.id) }}>Email</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-400">No reports yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
