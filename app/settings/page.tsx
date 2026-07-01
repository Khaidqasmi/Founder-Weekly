'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BUSINESS_TYPES, CURRENCIES, DAYS_OF_WEEK } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
          .then(({ data: m }) => {
            if (m) supabase.from('workspaces').select('*').eq('id', m.workspace_id).single()
              .then(({ data }) => setWorkspace(data))
          })
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.from('workspaces').update({
      business_name: fd.get('business_name'),
      business_type: fd.get('business_type'),
      website: fd.get('website'),
      currency: fd.get('currency'),
      main_goal: fd.get('main_goal'),
      report_day: fd.get('report_day'),
      report_time: fd.get('report_time'),
      report_email: fd.get('report_email'),
    }).eq('id', workspace.id)
    if (error) toast.error(error.message)
    else toast.success('Settings saved!')
    setLoading(false)
  }

  if (!workspace) return <div className="min-h-screen bg-zinc-950"><div className="max-w-2xl mx-auto px-4 py-8"><p>Loading...</p></div></div>

  return (
    <div className="min-h-screen bg-zinc-950">
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div><Label>Business Name</Label><Input name="business_name" defaultValue={workspace.business_name} /></div>
              <div><Label>Business Type</Label>
                <Select name="business_type" defaultValue={workspace.business_type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Website</Label><Input name="website" defaultValue={workspace.website} /></div>
              <div><Label>Currency</Label>
                <Select name="currency" defaultValue={workspace.currency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Main Goal</Label><Input name="main_goal" defaultValue={workspace.main_goal} /></div>
              <div><Label>Report Day</Label>
                <Select name="report_day" defaultValue={workspace.report_day}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS_OF_WEEK.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Report Time</Label><Input name="report_time" type="time" defaultValue={workspace.report_time} /></div>
              <div><Label>Report Email</Label><Input name="report_email" type="email" defaultValue={workspace.report_email} /></div>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
