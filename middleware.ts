import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/* ---------- Simple in-memory rate limiter (per server instance) ---------- */

const WINDOW_MS = 60_000
// requests allowed per IP per minute
const API_LIMIT = 120
const AUTH_LIMIT = 15 // login/signup + auth API: brute-force protection

const hits = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now })
    // Opportunistic cleanup so the map doesn't grow unbounded
    if (hits.size > 10_000) {
      for (const [k, v] of hits) {
        if (now - v.windowStart >= WINDOW_MS) hits.delete(k)
      }
    }
    return false
  }
  entry.count++
  return entry.count > limit
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const ip = getClientIp(request)

  // Rate limit auth pages and all API routes
  const isAuthSensitive =
    path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/api/oauth')
  if (isAuthSensitive && request.method !== 'GET' && isRateLimited(`auth:${ip}`, AUTH_LIMIT)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }
  if (path.startsWith('/api/') && isRateLimited(`api:${ip}`, API_LIMIT)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
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
