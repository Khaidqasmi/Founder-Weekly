'use client'

import Link from 'next/link'
import { LinkButton } from '@/components/link-button'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b bg-zinc-900">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          Founder Weekly
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">Dashboard</Link>
          <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white">Pricing</Link>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white">Log in</Link>
          <LinkButton href="/signup" size="sm">Start Free Trial</LinkButton>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t px-4 py-4 space-y-3 bg-zinc-900">
          <Link href="/dashboard" className="block text-sm" onClick={() => setOpen(false)}>Demo</Link>
          <Link href="/pricing" className="block text-sm" onClick={() => setOpen(false)}>Pricing</Link>
          <Link href="/login" className="block text-sm" onClick={() => setOpen(false)}>Log in</Link>
          <LinkButton href="/signup" size="sm" className="w-full">Start Free Trial</LinkButton>
        </div>
      )}
    </nav>
  )
}
