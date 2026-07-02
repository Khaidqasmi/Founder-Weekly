'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth/actions'
import { SiteHeader } from '@/components/site-header'
import { SearchBar, NotificationIcon, ProfileBlock } from '@/components/dashboard/widgets'
import {
  BarChart3, FileText, Upload, ListChecks, Settings, CreditCard, Plug,
  Menu, X, Truck, Clock, TrendingUp, LogOut,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
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

const isAppPage = (path: string) =>
  ['/dashboard', '/analytics', '/meta', '/couriers', '/history', '/data', '/actions', '/reports', '/integrations', '/settings', '/billing', '/onboarding', '/admin'].some((p) => path.startsWith(p))

function NavLinks({
  links,
  pathname,
  onNavigate,
}: {
  links: typeof appLinks
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-1">
      {links.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-gradient-to-r from-[#ec4899] to-[#d946ef] text-white shadow-[0_6px_18px_rgba(236,72,153,0.4)]'
                : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
            )}
          >
            <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/50')} />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function SidebarFooter({ isLoggedIn, checked }: { isLoggedIn: boolean; checked: boolean }) {
  if (!checked) return null
  if (isLoggedIn) {
    return (
      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
        >
          <LogOut className="h-4 w-4 text-white/50" />
          Logout
        </button>
      </form>
    )
  }
  return (
    <Link
      href="/signup"
      className="block rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_4px_14px_rgba(236,72,153,0.4)] transition-opacity hover:opacity-90"
    >
      Start Free Trial
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  const refreshAuth = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      setEmail(user?.email ?? null)
    } catch {
      setIsLoggedIn(false)
      setEmail(null)
    } finally {
      setChecked(true)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [pathname, refreshAuth])

  useEffect(() => {
    try {
      const supabase = createClient()
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        refreshAuth()
      })
      return () => subscription.unsubscribe()
    } catch {
      // Supabase not configured (e.g. missing env in local dev) — auth stays logged out.
    }
  }, [refreshAuth])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Marketing pages keep the existing top navigation untouched.
  if (!isAppPage(pathname)) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </>
    )
  }

  const visibleLinks = isLoggedIn || !checked ? appLinks : appLinks.filter((l) => !l.authOnly)

  const sidebarInner = (
    <>
      <Link href="/dashboard" className="mb-6 flex items-center px-2" aria-label="Ecom Panel home">
        <img src="/ecom-panel-logo.png" alt="Ecom Panel" className="h-11 w-auto max-w-[180px] object-contain" />
      </Link>
      <nav className="flex-1 overflow-y-auto pr-1">
        <NavLinks links={visibleLinks} pathname={pathname} onNavigate={() => setOpen(false)} />
      </nav>
      <div className="mt-4 border-t border-white/[0.08] pt-4">
        <SidebarFooter isLoggedIn={isLoggedIn} checked={checked} />
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-gradient-to-b from-[#221c4e] via-[#241e52] to-[#1c1642] p-4 lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#14102e]/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-[#221c4e] via-[#241e52] to-[#1c1642] p-4 shadow-2xl">
            <button
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#221c4e]/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/80 hover:bg-white/[0.15] hover:text-white lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={open}
            >
              <Menu size={18} />
            </button>
            <SearchBar pages={visibleLinks} className="hidden w-full max-w-xs sm:block" />
            <div className="ml-auto flex items-center gap-3">
              {isLoggedIn && <NotificationIcon href="/actions" />}
              <ProfileBlock email={email} checked={checked} />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
