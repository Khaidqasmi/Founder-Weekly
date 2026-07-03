// Courier-specific formatting/parsing helpers (couriers page only).

/**
 * Parse the many date shapes couriers, especially PostEx, return.
 * Returns null when the value is empty or unparseable, so callers can fall back
 * to another field instead of trusting an ambiguous Date parse.
 */
export function parseCourierDate(input?: string | null): Date | null {
  if (!input) return null
  const raw = String(input).trim().replace(/\s+/g, ' ')
  if (!raw) return null

  const monthMap: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  }

  const toHour24 = (hour: string, ampm?: string) => {
    let h = Number(hour || 0)
    const marker = ampm?.toLowerCase()
    if (marker === 'pm' && h < 12) h += 12
    if (marker === 'am' && h === 12) h = 0
    return h
  }

  const validDate = (dt: Date, year: number, month: number, day: number) => {
    if (Number.isNaN(dt.getTime())) return null
    if (dt.getFullYear() !== year || dt.getMonth() !== month || dt.getDate() !== day) return null
    return dt
  }

  // yyyy-mm-dd, optionally with time and AM/PM.
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i)
  if (m) {
    const [, y, mo, d, h = '0', mi = '0', s = '0', ampm] = m
    const year = Number(y)
    const month = Number(mo) - 1
    const day = Number(d)
    return validDate(new Date(year, month, day, toHour24(h, ampm), Number(mi), Number(s)), year, month, day)
  }

  // dd-mm-yyyy or dd/mm/yyyy, day-first as used by many Pakistan couriers.
  m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i)
  if (m) {
    const [, d, mo, y, h = '0', mi = '0', s = '0', ampm] = m
    const year = Number(y)
    const month = Number(mo) - 1
    const day = Number(d)
    return validDate(new Date(year, month, day, toHour24(h, ampm), Number(mi), Number(s)), year, month, day)
  }

  // dd Mon yyyy / dd-Mon-yyyy / dd Mon, yyyy.
  m = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9}),?[-\s](\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i)
  if (m) {
    const [, d, mon, y, h = '0', mi = '0', s = '0', ampm] = m
    const month = monthMap[mon.toLowerCase()]
    if (month !== undefined) {
      const year = Number(y)
      const day = Number(d)
      return validDate(new Date(year, month, day, toHour24(h, ampm), Number(mi), Number(s)), year, month, day)
    }
  }

  // Mon dd yyyy / Mon dd, yyyy.
  m = raw.match(/^([A-Za-z]{3,9})[-\s](\d{1,2}),?[-\s](\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i)
  if (m) {
    const [, mon, d, y, h = '0', mi = '0', s = '0', ampm] = m
    const month = monthMap[mon.toLowerCase()]
    if (month !== undefined) {
      const year = Number(y)
      const day = Number(d)
      return validDate(new Date(year, month, day, toHour24(h, ampm), Number(mi), Number(s)), year, month, day)
    }
  }

  // Fallback: full ISO strings with timezone, RFC-style strings, etc.
  const t = Date.parse(raw)
  return Number.isNaN(t) ? null : new Date(t)
}

/**
 * Compact PKR currency for KPI cards so large totals never overflow/wrap:
 *   411000 -> "PKR 411K", 1200000 -> "PKR 1.2M", 41100 -> "PKR 41.1K".
 * Values under 10,000 stay fully written ("PKR 9,999") since they already fit.
 */
export function formatCompactPKR(amount: number): string {
  const n = Number(amount) || 0
  const abs = Math.abs(n)
  const trim = (v: number) => {
    const s = v.toFixed(1)
    return s.endsWith('.0') ? s.slice(0, -2) : s
  }
  if (abs >= 1_000_000) return `PKR ${trim(n / 1_000_000)}M`
  if (abs >= 10_000) return `PKR ${trim(n / 1000)}K`
  return `PKR ${Math.round(n).toLocaleString()}`
}
