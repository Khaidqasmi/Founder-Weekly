'use client'

import { useEffect, useState } from 'react'

export type NotificationKind = 'success' | 'error' | 'info'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  message: string
  ts: number
  read: boolean
}

const KEY = 'fw-notifications'
const MAX = 50

type Listener = () => void
const listeners = new Set<Listener>()
let cache: AppNotification[] | null = null

function load(): AppNotification[] {
  if (typeof window === 'undefined') return []
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(cache)) cache = []
  } catch {
    cache = []
  }
  return cache!
}

function save(list: AppNotification[]) {
  cache = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage full/unavailable — keep the in-memory copy so the UI still works.
  }
  listeners.forEach((l) => l())
}

function makeId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

/** Record an app event so it shows up in the header notification bell. */
export function notify(input: { title: string; message: string; kind?: NotificationKind }) {
  if (typeof window === 'undefined') return
  const item: AppNotification = {
    id: makeId(),
    kind: input.kind || 'info',
    title: input.title,
    message: input.message,
    ts: Date.now(),
    read: false,
  }
  save([item, ...load()].slice(0, MAX))
}

export function markRead(id: string) {
  save(load().map((n) => (n.id === id ? { ...n, read: true } : n)))
}

export function markAllRead() {
  save(load().map((n) => (n.read ? n : { ...n, read: true })))
}

/** Subscribe a component to the notification list. */
export function useNotifications(): AppNotification[] {
  const [list, setList] = useState<AppNotification[]>([])
  useEffect(() => {
    setList([...load()])
    const l = () => setList([...load()])
    listeners.add(l)
    // Keep multiple open tabs in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        cache = null
        l()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(l)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  return list
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}
