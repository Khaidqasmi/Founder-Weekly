'use client'

import { useState } from 'react'
import { signUp } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BUSINESS_TYPES, COUNTRIES } from '@/lib/constants'
import Link from 'next/link'

export default function SignupPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Start Your Free Trial</CardTitle>
          <CardDescription>7 days free. No credit card required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone / WhatsApp</Label>
              <Input id="phone" name="phone" />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Select name="country">
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input id="business_name" name="business_name" required />
            </div>
            <div>
              <Label htmlFor="business_type">Business Type</Label>
              <Select name="business_type">
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="website">Business Website</Label>
              <Input id="website" name="website" placeholder="https://" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Start Free Trial'}
            </Button>
            <p className="text-center text-sm text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:underline">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
