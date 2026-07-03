'use client'

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, CheckCheck, Settings, CreditCard, LogOut, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { signOut } from '@/lib/auth/actions'
import { useNotifications, markRead, markAllRead, timeAgo, type NotificationKind } from '@/lib/notifications'

/** Close a dropdown when clicking/tapping outside of it. */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [ref, onOutside])
}

/* ------------------------------------------------------------------ */
/* Pastel design tokens (shared by the dashboard widget kit)           */
/* ------------------------------------------------------------------ */

export const PASTEL = {
  navy: '#312b63',
  muted: '#8d87b8',
  violet: '#8b5cf6',
  pink: '#ec4899',
  magenta: '#d946ef',
  lilacBorder: '#eeeaf9',
}

const CARD_TONES = {
  white: 'bg-white',
  pink: 'bg-[#fdf0f7]',
  lilac: 'bg-[#f4f0fd]',
} as const

export type CardTone = keyof typeof CARD_TONES

/* ------------------------------------------------------------------ */
/* DashboardCard — rounded pastel widget card                          */
/* ------------------------------------------------------------------ */

export function DashboardCard({
  children,
  className = '',
  tone = 'white',
}: {
  children: React.ReactNode
  className?: string
  tone?: CardTone
}) {
  return (
    <div
      className={`rounded-3xl border border-[#eeeaf9] ${CARD_TONES[tone]} shadow-[0_8px_30px_rgba(93,77,190,0.08)] ${className}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* RadialProgress — circular gradient progress ring                    */
/* ------------------------------------------------------------------ */

export function RadialProgress({
  value,
  size = 60,
  strokeWidth = 7,
  from = PASTEL.violet,
  to = PASTEL.pink,
  track = '#efeafb',
  label,
  labelClassName = '',
}: {
  value: number // 0–100
  size?: number
  strokeWidth?: number
  from?: string
  to?: string
  track?: string
  label?: string
  labelClassName?: string
}) {
  const id = useId()
  const clamped = Math.max(0, Math.min(100, value))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
        />
      </svg>
      <span className={`absolute text-[11px] font-bold text-[#312b63] ${labelClassName}`}>
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ProgressSlider — gradient progress bar with value marker pin        */
/* ------------------------------------------------------------------ */

export function ProgressSlider({
  value,
  from = PASTEL.violet,
  to = PASTEL.pink,
  className = '',
}: {
  value: number // 0–100
  from?: string
  to?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`relative h-2 w-full rounded-full bg-[#efeafb] ${className}`}>
      <div
        className="h-2 rounded-full"
        style={{ width: `${clamped}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
      />
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_6px_rgba(93,77,190,0.35)]"
        style={{ left: `calc(${clamped}% - 7px)`, background: to }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sparkline — tiny inline SVG chart for KPI cards (no recharts)       */
/* ------------------------------------------------------------------ */

function Sparkline({
  data,
  color = PASTEL.violet,
  variant = 'area',
  height = 34,
}: {
  data: number[]
  color?: string
  variant?: 'area' | 'bars'
  height?: number
}) {
  const id = useId()
  const w = 100
  const h = 32

  const points = useMemo(() => {
    if (!data.length) return []
    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const span = max - min || 1
    return data.map((v, i) => ({
      x: data.length === 1 ? w / 2 : (i / (data.length - 1)) * w,
      y: h - 3 - ((v - min) / span) * (h - 6),
    }))
  }, [data])

  if (!points.length) return null

  if (variant === 'bars') {
    const bw = Math.max(2, Math.min(8, (w / data.length) * 0.55))
    const max = Math.max(...data, 1)
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {data.map((v, i) => {
          const bh = Math.max(2, (v / max) * (h - 4))
          const x = data.length === 1 ? w / 2 - bw / 2 : (i / (data.length - 1)) * (w - bw)
          return <rect key={i} x={x} y={h - bh} width={bw} height={bh} rx={bw / 2} fill={color} opacity={0.85} />
        })}
      </svg>
    )
  }

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* KPIWidget — small stat card with icon chip, ring, or mini chart     */
/* ------------------------------------------------------------------ */

export const KPIWidget = memo(function KPIWidget({
  title,
  value,
  icon: Icon,
  accent = 'none',
  ring,
  spark,
  sparkVariant = 'area',
  dot = false,
}: {
  title: string
  value: string
  icon?: React.ElementType
  /** 'violet' | 'pink' render a gradient hero card; 'none' renders a white pastel card */
  accent?: 'none' | 'violet' | 'pink'
  /** 0–100: replaces the icon chip with a radial progress ring */
  ring?: number
  /** numeric series rendered as a mini sparkline under the value */
  spark?: number[]
  sparkVariant?: 'area' | 'bars'
  /** show a pink notification dot next to the title */
  dot?: boolean
}) {
  const isAccent = accent !== 'none'
  const gradient =
    accent === 'violet'
      ? 'bg-gradient-to-br from-[#7c5cf1] via-[#8b5cf6] to-[#c05bf0]'
      : 'bg-gradient-to-br from-[#ec4899] via-[#e250b4] to-[#c05bf0]'

  return (
    <div
      className={`flex flex-col justify-between rounded-3xl p-4 shadow-[0_8px_30px_rgba(93,77,190,0.10)] ${
        isAccent ? `${gradient} text-white` : 'border border-[#eeeaf9] bg-white'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <p
            className={`flex min-w-0 items-start gap-1.5 text-[10px] font-semibold uppercase tracking-wider sm:text-[11px] ${
              isAccent ? 'text-white/75' : 'text-[#8d87b8]'
            }`}
          >
            <span className="line-clamp-2 leading-snug [overflow-wrap:anywhere]">{title}</span>
            {dot && <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ec4899] shadow-[0_0_6px_rgba(236,72,153,0.8)]" />}
          </p>
          {typeof ring === 'number' ? (
            <RadialProgress value={ring} size={44} strokeWidth={5} />
          ) : Icon ? (
            <span
              className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:flex ${
                isAccent ? 'bg-white/20 text-white' : 'bg-[#f4f0fd] text-[#8b5cf6]'
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        {/* Value gets the full card width on its own line; font shrinks as the
            value gets longer so the number is always fully visible. */}
        <p
          className={`mt-1 line-clamp-2 font-bold leading-tight [overflow-wrap:anywhere] ${
            value.length > 14
              ? 'text-sm sm:text-base'
              : value.length > 10
                ? 'text-base sm:text-lg'
                : value.length > 7
                  ? 'text-base sm:text-xl'
                  : 'text-lg sm:text-2xl'
          } ${isAccent ? 'text-white' : 'text-[#312b63]'}`}
          title={value}
        >
          {value}
        </p>
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-2 -mb-1">
          <Sparkline data={spark} color={isAccent ? 'rgba(255,255,255,0.9)' : PASTEL.violet} variant={sparkVariant} />
        </div>
      )}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* ChartLegend — minimal pill legend                                   */
/* ------------------------------------------------------------------ */

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6d64b8]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* SearchBar — pill search with navigation suggestions                 */
/* ------------------------------------------------------------------ */

export function SearchBar({
  pages,
  className = '',
}: {
  pages: { href: string; label: string }[]
  className?: string
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, close)

  const query = q.trim().toLowerCase()
  const matches = useMemo(
    () => (query ? pages.filter((p) => p.label.toLowerCase().includes(query)) : []),
    [pages, query]
  )

  function go(href: string) {
    router.push(href)
    setQ('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!query) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (matches.length ? (h + 1) % matches.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (matches.length ? (h - 1 + matches.length) % matches.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = matches[highlight] || matches[0]
      if (target) go(target.href)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => q.trim() && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search pages…"
        role="combobox"
        aria-expanded={open && !!query}
        aria-label="Search pages"
        className="h-9 w-full rounded-full border border-white/10 bg-white/[0.08] pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-[#ec4899]/60 focus:bg-white/[0.12]"
      />
      {open && query && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#eeeaf9] bg-white py-1.5 shadow-[0_16px_50px_rgba(93,77,190,0.25)]">
          {matches.length > 0 ? (
            matches.map((m, i) => (
              <button
                key={m.href}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(m.href)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium transition-colors ${
                  i === highlight ? 'bg-[#f4f0fd] text-[#312b63]' : 'text-[#4a4477]'
                }`}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />
                {m.label}
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-[#8d87b8]">No results for &ldquo;{q.trim()}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* NotificationBell — bell with unread badge + dropdown feed           */
/* ------------------------------------------------------------------ */

const KIND_STYLE: Record<NotificationKind, { icon: React.ElementType; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600' },
  error: { icon: AlertCircle, className: 'bg-rose-50 text-rose-600' },
  info: { icon: Info, className: 'bg-[#f4f0fd] text-[#8b5cf6]' },
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, close)

  const items = useNotifications()
  const unread = items.reduce((n, i) => n + (i.read ? 0 : 1), 0)

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/80 transition-colors hover:bg-white/[0.15] hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-[#ec4899] to-[#d946ef] px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(236,72,153,0.7)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#eeeaf9] bg-white shadow-[0_16px_50px_rgba(93,77,190,0.25)]">
          <div className="flex items-center justify-between border-b border-[#f0ecfb] px-4 py-3">
            <p className="text-sm font-bold text-[#312b63]">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-[#8b5cf6] transition-colors hover:bg-[#f4f0fd]"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f0fd]">
                <Bell className="h-5 w-5 text-[#8b5cf6]" />
              </span>
              <p className="mt-3 text-sm font-semibold text-[#312b63]">No notifications yet</p>
              <p className="mt-1 text-xs text-[#8d87b8]">Order syncs, payments, and courier updates will show up here.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const style = KIND_STYLE[n.kind] || KIND_STYLE.info
                const KindIcon = style.icon
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8f6fd] ${
                        n.read ? '' : 'bg-[#fdf0f7]/60'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.className}`}>
                        <KindIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-[#312b63]">{n.title}</span>
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ec4899]" />}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-[#6d64b8]">{n.message}</span>
                        <span className="mt-1 block text-[11px] text-[#a79fd6]">{timeAgo(n.ts)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ProfileBlock — avatar dropdown (or auth pills when logged out)      */
/* ------------------------------------------------------------------ */

export function ProfileBlock({ email, checked }: { email: string | null; checked: boolean }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, close)

  if (!checked) return <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.08]" />

  if (!email) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full px-3.5 py-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] px-4 py-1.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(236,72,153,0.4)] transition-opacity hover:opacity-90"
        >
          Sign Up
        </Link>
      </div>
    )
  }

  const menuItem =
    'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#4a4477] transition-colors hover:bg-[#f4f0fd] hover:text-[#312b63]'

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-90"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-sm font-bold uppercase text-white">
          {email[0]}
        </span>
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-white/85 md:block">{email}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#eeeaf9] bg-white py-1.5 shadow-[0_16px_50px_rgba(93,77,190,0.25)]">
          <p className="truncate border-b border-[#f0ecfb] px-4 py-2.5 text-xs font-semibold text-[#8d87b8]">{email}</p>
          <Link href="/billing" onClick={close} className={menuItem}>
            <CreditCard className="h-4 w-4 text-[#8b5cf6]" /> Billing
          </Link>
          <Link href="/settings" onClick={close} className={menuItem}>
            <Settings className="h-4 w-4 text-[#8b5cf6]" /> Settings
          </Link>
          <form action={signOut}>
            <button type="submit" className={`${menuItem} border-t border-[#f0ecfb] text-rose-600 hover:text-rose-700`}>
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
