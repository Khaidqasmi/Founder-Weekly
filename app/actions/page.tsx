'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ActionsPage() {
  const [actions, setActions] = useState<any[]>([])
  const [wsId, setWsId] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
          .then(({ data }) => {
            if (data) {
              setWsId(data.workspace_id)
              loadActions(data.workspace_id)
            }
          })
      }
    })
  }, [])

  async function loadActions(wid: string) {
    const supabase = createClient()
    const { data } = await supabase.from('action_items').select('*').eq('workspace_id', wid).order('created_at', { ascending: false })
    setActions(data || [])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const supabase = createClient()
    const item = {
      workspace_id: wsId,
      action: fd.get('action'),
      category: fd.get('category'),
      priority: fd.get('priority'),
      reason: fd.get('reason'),
      expected_impact: fd.get('expected_impact'),
      owner: fd.get('owner'),
      deadline: fd.get('deadline') || null,
      status: fd.get('status') || 'Pending',
    }

    if (editing) {
      await supabase.from('action_items').update(item).eq('id', editing.id)
      toast.success('Action updated')
    } else {
      await supabase.from('action_items').insert(item)
      toast.success('Action created')
    }
    setEditing(null)
    setShowForm(false)
    loadActions(wsId)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('action_items').delete().eq('id', id)
    toast.success('Action deleted')
    loadActions(wsId)
  }

  async function handleStatusChange(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('action_items').update({ status }).eq('id', id)
    loadActions(wsId)
  }

  function ActionForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Action *</Label><Input name="action" defaultValue={editing?.action} required /></div>
          <div><Label>Category</Label><Input name="category" defaultValue={editing?.category} /></div>
          <div><Label>Priority</Label>
            <Select name="priority" defaultValue={editing?.priority || 'Medium'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reason</Label><Input name="reason" defaultValue={editing?.reason} /></div>
          <div><Label>Expected Impact</Label><Input name="expected_impact" defaultValue={editing?.expected_impact} /></div>
          <div><Label>Owner</Label><Input name="owner" defaultValue={editing?.owner} /></div>
          <div><Label>Deadline</Label><Input name="deadline" type="date" defaultValue={editing?.deadline} /></div>
          {editing && (
            <div><Label>Status</Label>
              <Select name="status" defaultValue={editing?.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={() => { setEditing(null); setShowForm(false) }}>Cancel</Button>
        </div>
      </form>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Action Plan</h1>
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>Add Action</Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardContent className="pt-6"><ActionForm /></CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-[200px] truncate">{a.action}</TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>
                      <Badge variant={a.priority === 'High' ? 'destructive' : a.priority === 'Medium' ? 'secondary' : 'outline'}>{a.priority}</Badge>
                    </TableCell>
                    <TableCell>{a.owner}</TableCell>
                    <TableCell>{a.deadline || '-'}</TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(v) => handleStatusChange(a.id, v)}>
                        <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setShowForm(true) }}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(a.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {actions.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-zinc-500">No actions yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
