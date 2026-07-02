import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/* ==========================================================================
   Anti-abuse shield (per server instance)
   - Tiered rate limits: auth endpoints < API < pages
   - Escalating bans: IPs that keep hitting limits get blocked for 15 minutes
   - Vulnerability-scanner probes are blocked instantly and count as strikes
   - Oversized request bodies are rejected before they reach any route
   Note: this blunts application-layer (L7) floods and brute-force attempts.
   Volumetric DDoS must be absorbed at the platform edge (see Vercel notes).
   ========================================================================== */

const WINDOW_MS = 60_000
const AUTH_LIMIT = 10 // POSTs to login/signup/oauth per IP per minute
const API_LIMIT = 120 // /api requests per IP per minute
const PAGE_LIMIT = 300 // all other requests per IP per minute

const BAN_MS = 15 * 60_000 // temporary ban length
const STRIKE_WINDOW_MS = 10 * 60_000 // strikes accumulate over 10 minutes
const STRIKES_TO_BAN = 3

const MAX_API_BODY_BYTES = 1_000_000 // 1 MB is far above any legitimate request

// Paths only vulnerability scanners request — never legitimate users
const SCANNER_PATTERNS = [
  /\.(php|asp|aspx|jsp|cgi|env|bak|sql|ini|yml|yaml|config)$/i,
  /^\/(wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|pma|mysql|cgi-bin|vendor|\.git|\.env|\.aws|\.ssh|admin\.php|shell|config\.json|server-status|actuator|solr|owa|autodiscover)/i,
]

const hits = new Map<string, { count: number; windowStart: number }>()
const strikes = new Map<string, { count: number; firstStrike: number }>()
const bans = new Map<string, number>() // ip -> banned-until timestamp

function cleanupMaps(now: number) {
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (now - v.windowStart >= WINDOW_MS) hits.delete(k)
  }
  if (strikes.size > 5_000) {
    for (const [k, v] of strikes) if (now - v.firstStrike >= STRIKE_WINDOW_MS) strikes.delete(k)
  }
  if (bans.size > 5_000) {
    for (const [k, until] of bans) if (now >= until) bans.delete(k)
  }
}

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now })
    cleanupMaps(now)
    return false
  }
  entry.count++
  return entry.count > limit
}

// Record a strike; returns true if the IP just crossed the ban threshold
function addStrike(ip: string): boolean {
  const now = Date.now()
  const entry = strikes.get(ip)
  if (!entry || now - entry.firstStrike >= STRIKE_WINDOW_MS) {
    strikes.set(ip, { count: 1, firstStrike: now })
    return false
  }
  entry.count++
  if (entry.count >= STRIKES_TO_BAN) {
    bans.set(ip, now + BAN_MS)
    strikes.delete(ip)
    console.warn(`[security] Banned IP ${ip} for ${BAN_MS / 60000} min after repeated abuse`)
    return true
  }
  return false
}

function isBanned(ip: string): boolean {
  const until = bans.get(ip)
  if (!until) return false
  if (Date.now() >= until) {
    bans.delete(ip)
    return false
  }
  return true
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function tooManyRequests(retryAfterSeconds: number) {
  return new NextResponse(JSON.stringify({ error: 'Too many requests. Try again later.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) },
  })
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const ip = getClientIp(request)

  // 1. Banned IPs get nothing — cheapest possible rejection
  if (isBanned(ip)) {
    return tooManyRequests(900)
  }

  // 2. Block vulnerability-scanner probes outright and strike the IP
  if (SCANNER_PATTERNS.some((re) => re.test(path))) {
    addStrike(ip)
    return new NextResponse('Not found', { status: 404 })
  }

  // 3. Reject oversized bodies before any route parses them
  if (path.startsWith('/api/')) {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_API_BODY_BYTES) {
      addStrike(ip)
      return new NextResponse(JSON.stringify({ error: 'Request body too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // 4. Tiered rate limits — exceeding any of them earns a strike
  const isAuthSensitive =
    path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/api/oauth')
  if (isAuthSensitive && request.method !== 'GET' && isRateLimited(`auth:${ip}`, AUTH_LIMIT)) {
    addStrike(ip)
    return tooManyRequests(60)
  }
  if (path.startsWith('/api/')) {
    if (isRateLimited(`api:${ip}`, API_LIMIT)) {
      addStrike(ip)
      return tooManyRequests(60)
    }
  } else if (isRateLimited(`page:${ip}`, PAGE_LIMIT)) {
    addStrike(ip)
    return tooManyRequests(60)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Pages that strictly require login — dashboard stays open for demo mode
  // (demo shows only fake sample data; real business data always requires login)
  const protectedPaths = ['/onboarding', '/settings', '/billing', '/reports', '/actions', '/admin', '/data', '/history']
  const authPaths = ['/login', '/signup']

  const isProtected = protectedPaths.some((p) => path.startsWith(p))
  const isAuth = authPaths.some((p) => path.startsWith(p))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuth && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv)$).*)',
  ],
}
