'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/link-button'
import { signOut } from '@/lib/auth/actions'
import { BarChart3, FileText, Upload, ListChecks, Settings, CreditCard, Plug, Menu, X, Truck, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, requiresAuth: false },
  { href: '/couriers', label: 'Couriers', icon: Truck, requiresAuth: false },
  { href: '/history', label: 'History', icon: Clock, requiresAuth: true },
  { href: '/data', label: 'Data Entry', icon: FileText, requiresAuth: true },
  { href: '/data/upload', label: 'CSV Upload', icon: Upload, requiresAuth: true },
  { href: '/actions', label: 'Actions', icon: ListChecks, requiresAuth: true },
  { href: '/reports', label: 'Reports', icon: FileText, requiresAuth: true },
  { href: '/integrations', label: 'Integrations', icon: Plug, requiresAuth: false },
  { href: '/settings', label: 'Settings', icon: Settings, requiresAuth: true },
  { href: '/billing', label: 'Billing', icon: CreditCard, requiresAuth: true },
]

export function AppNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsLoggedIn(!!user)
      })
    } catch {
      setIsLoggedIn(false)
    }
  }, [])

  const visibleItems = navItems.filter((item) => !item.requiresAuth || isLoggedIn)

  return (
    <nav className="border-b bg-zinc-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg">Founder Weekly</Link>
        <div className="hidden lg:flex items-center gap-1">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-2 rounded-md text-sm transition-colors',
                pathname === item.href ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">Logout</Button>
            </form>
          ) : (
            <div className="flex gap-2 ml-2">
              <LinkButton href="/login" variant="ghost" size="sm">Log In</LinkButton>
              <LinkButton href="/signup" size="sm">Sign Up</LinkButton>
            </div>
          )}
        </div>
        <button className="lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t px-4 py-3 space-y-1 bg-zinc-900">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn('block px-3 py-2 rounded-md text-sm', pathname === item.href ? 'bg-zinc-800 font-medium' : 'text-zinc-400')}
              onClick={() => setOpen(false)}
            >
              <item.icon className="inline w-4 h-4 mr-2" />
              {item.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <form action={signOut}>
              <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">Logout</Button>
            </form>
          ) : (
            <div className="space-y-1 pt-2 border-t">
              <LinkButton href="/login" variant="ghost" size="sm" className="w-full justify-start">Log In</LinkButton>
              <LinkButton href="/signup" size="sm" className="w-full">Start Free Trial</LinkButton>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
