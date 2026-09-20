export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface DateRange {
  from: string
  to: string
}

export function isValidISODate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function validateDateRange(from: string, to: string): string | null {
  if (!from || !to) return 'Start and end dates are required.'
  if (!isValidISODate(from) || !isValidISODate(to)) return 'Use valid dates in YYYY-MM-DD format.'
  if (from > to) return 'Start date cannot be after end date.'
  return null
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysAgoDateKey(days: number, now = new Date()) {
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - Math.max(0, days))
  return localDateKey(date)
}

/** Returns exactly `days` calendar dates, including today. */
export function inclusiveDayRange(days: number, now = new Date()): DateRange {
  const safeDays = Math.max(1, Math.floor(days))
  return {
    from: daysAgoDateKey(safeDays - 1, now),
    to: daysAgoDateKey(0, now),
  }
}

export function isDateInRange(date: Date | null, from: string, to: string) {
  if (!from || !to) return true
  if (!date || Number.isNaN(date.getTime())) return false
  const key = localDateKey(date)
  return key >= from && key <= to
}
