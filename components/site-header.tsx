'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/link-button'
import { signOut } from '@/lib/auth/actions'
import { BarChart3, FileText, Upload, ListChecks, Settings, CreditCard, Plug, Menu, X, Truck, Clock, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const appLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/meta', label: 'Meta Ads', icon: BarChart3 },
  { href: '/couriers', label: 'Couriers', icon: Truck },
  { href: '/history', label: 'History', icon: Clock, authOnly: true },
  { href: '/data', label: 'Data Entry', icon: FileText, authOnly: true },
  { href: '/data/upload', label: 'CSV Upload', icon: Upload, authOnly: true },
  { href: '/actions', label: 'Actions', icon: ListChecks, authOnly: true },
  { href: '/reports', label: 'Reports', icon: FileText, authOnly: true },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings, authOnly: true },
  { href: '/billing', label: 'Billing', icon: CreditCard, authOnly: true },
]

const marketingLinks = [
  { href: '/', label: 'Home' },
  { href: '/#features', label: 'Features' },
  { href: '/#integrations', label: 'Integrations' },
  { href: '/#preview', label: 'Preview' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faqs', label: 'FAQs' },
  { href: '/#contact', label: 'Contact' },
]

const isAppPage = (path: string) =>
  ['/dashboard', '/analytics', '/meta', '/couriers', '/history', '/data', '/actions', '/reports', '/integrations', '/settings', '/billing', '/onboarding', '/admin'].some((p) => path.startsWith(p))

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsLoggedIn(!!user)
        setChecked(true)
      })
    } catch {
      setChecked(true)
    }
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const inApp = isAppPage(pathname)
  const links = isLoggedIn
    ? appLinks.filter((l) => !l.authOnly || isLoggedIn)
    : inApp
    ? appLinks.filter((l) => !l.authOnly || isLoggedIn)
    : marketingLinks

  return (
    <nav className="border-b border-white/10 bg-zinc-900 sticky top-0 z-50">
      <div className="relative max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 rounded-xl bg-white px-3 py-1.5 shadow-sm shadow-black/20 lg:static lg:translate-x-0 shrink-0"
          aria-label="Ecom Panel home"
        >
          <img
            src="/ecom-panel-logo.png"
            alt="Ecom Panel"
            className="h-10 w-auto max-w-[170px] object-contain sm:h-11 lg:h-12 lg:max-w-[210px]"
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors',
                pathname === item.href
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}

          {checked && isLoggedIn ? (
            <form action={signOut} className="ml-2">
              <Button variant="ghost" size="sm" type="submit">Logout</Button>
            </form>
          ) : checked ? (
            <div className="flex gap-2 ml-2">
              <LinkButton href="/login" variant="ghost" size="sm">Log In</LinkButton>
              <LinkButton href="/signup" size="sm">Start Free Trial</LinkButton>
            </div>
          ) : null}
        </div>

        {/* Mobile menu button */}
        <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation menu" aria-expanded={open}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t px-4 py-3 space-y-1 bg-zinc-900 max-h-[70vh] overflow-y-auto">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block px-3 py-2 rounded-md text-sm',
                pathname === item.href ? 'bg-zinc-800 font-medium' : 'text-zinc-400'
              )}
            >
              {item.label}
            </Link>
          ))}

          {!inApp && (
            <>
              <Link href="/privacy" className="block px-3 py-2 text-sm text-zinc-400">Privacy</Link>
              <Link href="/terms" className="block px-3 py-2 text-sm text-zinc-400">Terms</Link>
            </>
          )}

          <div className="pt-2 border-t space-y-1">
            {checked && isLoggedIn ? (
              <form action={signOut}>
                <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">Logout</Button>
              </form>
            ) : checked ? (
              <>
                <LinkButton href="/login" variant="ghost" size="sm" className="w-full justify-start">Log In</LinkButton>
                <LinkButton href="/signup" size="sm" className="w-full">Start Free Trial</LinkButton>
              </>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  )
}
