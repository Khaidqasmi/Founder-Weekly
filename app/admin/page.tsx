'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KPICard } from '@/components/dashboard/kpi-card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { signOut } from '@/lib/auth/actions'

interface Lead {
  profile: any
  workspace: any
  trial: any
  hasUploads: boolean
  hasReports: boolean
  hasEmails: boolean
  score: string
  contactStatus: string
  notes: any[]
}

export default function AdminPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, upgraded: 0 })
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [noteModal, setNoteModal] = useState<{ wsId: string; notes: any[] } | null>(null)
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    loadAdmin()
  }, [])

  async function loadAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') { router.push('/dashboard'); return }
    setIsAdmin(true)

    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    const { data: workspaces } = await supabase.from('workspaces').select('*')
    const { data: trials } = await supabase.from('trial_subscriptions').select('*')
    const { data: uploads } = await supabase.from('csv_uploads').select('workspace_id')
    const { data: reports } = await supabase.from('reports').select('workspace_id')
    const { data: emailLogs } = await supabase.from('report_email_logs').select('workspace_id, status')
    const { data: adminNotes } = await supabase.from('admin_notes').select('*').order('created_at', { ascending: false })

    const uploadSet = new Set((uploads || []).map((u) => u.workspace_id))
    const reportSet = new Set((reports || []).map((r) => r.workspace_id))
    const emailSet = new Set((emailLogs || []).filter((e) => e.status === 'sent').map((e) => e.workspace_id))

    const active = (trials || []).filter((t) => t.status === 'active' && new Date(t.trial_end) > new Date()).length
    const expired = (trials || []).filter((t) => t.status === 'active' && new Date(t.trial_end) <= new Date()).length
    const upgraded = (trials || []).filter((t) => t.status === 'upgraded').length

    setStats({ total: (profiles || []).length, active, expired, upgraded })

    const leadList = (profiles || []).filter((p) => p.role !== 'admin').map((p) => {
      const ws = (workspaces || []).find((w) => w.owner_id === p.id)
      const trial = ws ? (trials || []).find((t) => t.workspace_id === ws.id) : null
      const hasUploads = ws ? uploadSet.has(ws.id) : false
      const hasReports = ws ? reportSet.has(ws.id) : false
      const hasEmails = ws ? emailSet.has(ws.id) : false

      let score = 'Low'
      if (hasUploads && hasReports) score = 'High'
      else if (ws) score = 'Medium'

      const notes = ws ? (adminNotes || []).filter((n) => n.workspace_id === ws.id) : []

      return { profile: p, workspace: ws, trial, hasUploads, hasReports, hasEmails, score, contactStatus: '', notes }
    })

    setLeads(leadList)
    setLoading(false)
  }

  async function addNote(wsId: string) {
    if (!newNote.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('admin_notes').insert({ workspace_id: wsId, admin_id: user.id, note: newNote })
    toast.success('Note added')
    setNewNote('')
    setNoteModal(null)
    loadAdmin()
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-8"><p>Loading admin...</p></div>
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard title="Total Signups" value={String(stats.total)} />
          <KPICard title="Active Trials" value={String(stats.active)} />
          <KPICard title="Expired Trials" value={String(stats.expired)} />
          <KPICard title="Upgraded" value={String(stats.upgraded)} />
        </div>

        <Card>
          <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.profile.id}>
                      <TableCell>{l.profile.full_name}</TableCell>
                      <TableCell className="text-xs">{l.profile.email}</TableCell>
                      <TableCell className="text-xs">{l.profile.phone}</TableCell>
                      <TableCell>{l.workspace?.business_name || '-'}</TableCell>
                      <TableCell>{l.profile.country}</TableCell>
                      <TableCell>
                        {l.trial ? (
                          <Badge variant={l.trial.status === 'upgraded' ? 'default' : new Date(l.trial.trial_end) > new Date() ? 'secondary' : 'destructive'}>
                            {l.trial.status === 'upgraded' ? 'Upgraded' : new Date(l.trial.trial_end) > new Date() ? 'Active' : 'Expired'}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{l.hasUploads ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{l.hasReports ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Badge variant={l.score === 'High' ? 'default' : l.score === 'Medium' ? 'secondary' : 'outline'}>{l.score}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setNoteModal({ wsId: l.workspace?.id, notes: l.notes })}>
                          Notes ({l.notes.length})
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {noteModal && (
        <Dialog open onOpenChange={() => setNoteModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Admin Notes</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {noteModal.notes.map((n) => (
                <div key={n.id} className="bg-gray-50 p-3 rounded text-sm">
                  <p>{n.note}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
              {noteModal.notes.length === 0 && <p className="text-gray-400 text-sm">No notes yet</p>}
            </div>
            <div className="flex gap-2">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." />
              <Button onClick={() => addNote(noteModal.wsId)}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
