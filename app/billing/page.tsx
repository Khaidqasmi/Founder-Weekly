'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/link-button'
import { createClient } from '@/lib/supabase/client'
import { getTrialDaysRemaining } from '@/lib/utils'

export default function BillingPage() {
  const [trial, setTrial] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
          .then(({ data: m }) => {
            if (m) supabase.from('trial_subscriptions').select('*').eq('workspace_id', m.workspace_id).single()
              .then(({ data }) => setTrial(data))
          })
      }
    })
  }, [])

  const daysLeft = trial ? getTrialDaysRemaining(trial.trial_end) : 0
  const isExpired = trial?.status === 'active' && daysLeft === 0
  const isUpgraded = trial?.status === 'upgraded'

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Billing</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {!trial ? (
              <p className="text-gray-500">Loading...</p>
            ) : isUpgraded ? (
              <div>
                <Badge className="bg-green-100 text-green-800">Upgraded</Badge>
                <p className="mt-2 text-gray-600">You have full access to all features.</p>
              </div>
            ) : isExpired ? (
              <div>
                <Badge variant="destructive">Trial Expired</Badge>
                <p className="mt-2 text-gray-600">Your 7-day free trial has ended. Upgrade to continue using all features.</p>
              </div>
            ) : (
              <div>
                <Badge className="bg-blue-100 text-blue-800">Free Trial</Badge>
                <p className="mt-2 text-gray-600">
                  <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> remaining in your trial.
                </p>
                <p className="text-sm text-gray-500 mt-1">Trial ends: {new Date(trial.trial_end).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upgrade to Growth Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Get unlimited access, API integrations, and priority support.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <LinkButton href="https://wa.me/923000000000?text=I%20want%20to%20upgrade%20my%20Founder%20Weekly%20account" className="bg-green-600 hover:bg-green-700">
                Contact on WhatsApp
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
