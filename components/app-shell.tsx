'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SiteHeader } from '@/components/site-header'
import { SearchBar, NotificationBell, ProfileBlock } from '@/components/dashboard/widgets'
import {
  BarChart3, FileText, Upload, ListChecks, Settings, CreditCard, Plug,
  Menu, X, Truck, Clock, TrendingUp, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const COLLAPSE_KEY = 'fw-sidebar-collapsed'

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

/** Tooltip shown next to icon-only sidebar items when collapsed. */
function SideTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#171233] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[0_8px_24px_rgba(23,18,51,0.5)] transition-opacity group-hover:opacity-100">
      {label}
    </span>
  )
}

function NavLinks({
  links,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  links: typeof appLinks
  pathname: string
  collapsed?: boolean
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
            title={collapsed ? item.label : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3.5 py-2.5',
              active
                ? 'bg-gradient-to-r from-[#ec4899] to-[#d946ef] text-white shadow-[0_6px_18px_rgba(236,72,153,0.4)]'
                : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
            )}
          >
            <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/50')} />
            {!collapsed && item.label}
            {collapsed && <SideTooltip label={item.label} />}
          </Link>
        )
      })}
    </div>
  )
}

function SidebarFooter({
  isLoggedIn,
  checked,
  collapsed = false,
}: {
  isLoggedIn: boolean
  checked: boolean
  collapsed?: boolean
}) {
  // Logout lives in the profile dropdown in the topbar — the sidebar only
  // shows the trial CTA for logged-out visitors.
  if (!checked || isLoggedIn) return null
  if (collapsed) {
    return (
      <Link
        href="/signup"
        title="Start Free Trial"
        className="group relative flex items-center justify-center rounded-xl bg-gradient-to-r from-[#ec4899] to-[#a855f7] py-2.5 text-white shadow-[0_4px_14px_rgba(236,72,153,0.4)] transition-opacity hover:opacity-90"
      >
        <TrendingUp className="h-4 w-4" />
        <SideTooltip label="Start Free Trial" />
      </Link>
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
  const [collapsed, setCollapsed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {}
  }, [])

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {}
      return !c
    })
  }

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

  // A manually collapsed sidebar temporarily expands as an overlay on hover;
  // the content padding stays at rail width so the layout doesn't jump.
  const expanded = !collapsed || hovered

  // Mobile drawer always shows the full expanded menu.
  const drawerInner = (
    <>
      <Link href="/dashboard" className="mb-6 flex items-center px-2" aria-label="Ecom Panel home">
        <img src="/ecom-panel-logo.png" alt="Ecom Panel" className="h-11 w-auto max-w-[180px] object-contain" />
      </Link>
      <nav className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <NavLinks links={visibleLinks} pathname={pathname} onNavigate={() => setOpen(false)} />
      </nav>
      {checked && !isLoggedIn && (
        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <SidebarFooter isLoggedIn={isLoggedIn} checked={checked} />
        </div>
      )}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop sidebar (collapsible; hover temporarily expands the rail) */}
      <aside
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-gradient-to-b from-[#221c4e] via-[#241e52] to-[#1c1642] transition-[width] duration-200 lg:flex',
          expanded ? 'w-64 p-4' : 'w-[72px] p-3',
          collapsed && hovered && 'shadow-[12px_0_50px_rgba(23,18,51,0.5)]'
        )}
      >
        <div className={cn('mb-6 flex items-center', expanded ? 'px-2' : 'justify-center')}>
          {expanded ? (
            <Link href="/dashboard" aria-label="Ecom Panel home">
              <img src="/ecom-panel-logo.png" alt="Ecom Panel" className="h-11 w-auto max-w-[160px] object-contain" />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              aria-label="Ecom Panel home"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white shadow-[0_4px_14px_rgba(139,92,246,0.4)]"
            >
              <BarChart3 className="h-5 w-5" />
            </Link>
          )}
        </div>

        <nav className={cn('no-scrollbar flex-1 overflow-y-auto overflow-x-hidden', expanded && 'pr-1')}>
          <NavLinks links={visibleLinks} pathname={pathname} collapsed={!expanded} />
        </nav>

        <div className="mt-4 space-y-1 border-t border-white/[0.08] pt-4">
          <SidebarFooter isLoggedIn={isLoggedIn} checked={checked} collapsed={!expanded} />
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-xl text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white',
              expanded ? 'px-3.5 py-2.5' : 'justify-center px-0 py-2.5'
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0 text-white/50" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0 text-white/50" />
            )}
            {expanded && (collapsed ? 'Pin open' : 'Collapse')}
            {!expanded && <SideTooltip label="Expand sidebar" />}
          </button>
        </div>
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
            {drawerInner}
          </aside>
        </div>
      )}

      {/* Content column */}
      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
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
              {isLoggedIn && <NotificationBell />}
              <ProfileBlock email={email} checked={checked} />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
