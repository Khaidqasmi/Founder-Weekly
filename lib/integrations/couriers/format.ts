// Courier-specific formatting/parsing helpers (couriers page only).

/**
 * Parse the many date shapes couriers (especially PostEx) return:
 *   - yyyy-mm-dd
 *   - yyyy-mm-dd hh:mm:ss   (and yyyy-mm-ddThh:mm:ss)
 *   - dd-mm-yyyy
 *   - dd/mm/yyyy            (Pakistani day-first order)
 * Returns null when the value is empty or unparseable, so callers can fall back
 * to another field instead of trusting an ambiguous `new Date()` result.
 */
export function parseCourierDate(input?: string | null): Date | null {
  if (!input) return null
  const raw = String(input).trim()
  if (!raw) return null

  // yyyy-mm-dd  (optionally  hh:mm:ss  after a space or T)
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const [, y, mo, d, h = '0', mi = '0', s = '0'] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // dd-mm-yyyy or dd/mm/yyyy (day first — PostEx / Pakistan format)
  m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const [, d, mo, y, h = '0', mi = '0', s = '0'] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // Fallback: full ISO strings with timezone, etc.
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
