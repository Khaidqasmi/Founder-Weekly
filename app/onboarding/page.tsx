'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BUSINESS_TYPES, CURRENCIES, DAYS_OF_WEEK } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [settings, setSettings] = useState({
    business_type: '',
    currency: 'PKR',
    main_goal: '',
    report_day: 'Monday',
    report_time: '09:00',
    report_email: '',
    data_method: 'demo',
  })

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (!member) { setLoading(false); return }

    await supabase
      .from('workspaces')
      .update({
        business_type: settings.business_type,
        currency: settings.currency,
        main_goal: settings.main_goal,
        report_day: settings.report_day,
        report_time: settings.report_time,
        report_email: settings.report_email || user.email,
      })
      .eq('id', member.workspace_id)

    if (settings.data_method === 'demo') {
      const res = await fetch('/api/seed-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: member.workspace_id }),
      })
      if (!res.ok) {
        toast.error('Failed to seed demo data')
      }
    }

    toast.success('Onboarding complete!')
    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Set Up Your Dashboard</CardTitle>
          <p className="text-sm text-gray-500">Step {step} of 2</p>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Business Type</Label>
                <Select value={settings.business_type} onValueChange={(v: string | null) => v && setSettings({ ...settings, business_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={settings.currency} onValueChange={(v: string | null) => v && setSettings({ ...settings, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Main Goal</Label>
                <Input
                  placeholder="e.g., Grow revenue to 1M PKR/month"
                  value={settings.main_goal}
                  onChange={(e) => setSettings({ ...settings, main_goal: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>Next</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Weekly Report Day</Label>
                <Select value={settings.report_day} onValueChange={(v: string | null) => v && setSettings({ ...settings, report_day: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Time</Label>
                <Input
                  type="time"
                  value={settings.report_time}
                  onChange={(e) => setSettings({ ...settings, report_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Report Email</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={settings.report_email}
                  onChange={(e) => setSettings({ ...settings, report_email: e.target.value })}
                />
              </div>
              <div>
                <Label>How would you like to start?</Label>
                <Select value={settings.data_method} onValueChange={(v: string | null) => v && setSettings({ ...settings, data_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Use demo data</SelectItem>
                    <SelectItem value="csv">Upload CSV</SelectItem>
                    <SelectItem value="manual">Manual entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={handleSave} disabled={loading}>
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
