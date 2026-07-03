import type { AIContext } from '@/lib/ai/context'

const CONTEXT_TTL_MS = 45_000
const contextCache = new Map<string, { value: AIContext; expiresAt: number }>()

export function getCachedContext(key: string): AIContext | null {
  const entry = contextCache.get(key)
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.value
}

export function setCachedContext(key: string, value: AIContext) {
  contextCache.set(key, { value, expiresAt: Date.now() + CONTEXT_TTL_MS })
}

// Simple per-user in-memory rate limit. Resets on cold start — good enough
// to stop accidental request storms from a single chat session without
// needing an external store.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 15
const requestLog = new Map<string, number[]>()

export function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const timestamps = (requestLog.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  requestLog.set(userId, timestamps)
  return timestamps.length > RATE_LIMIT_MAX
}
