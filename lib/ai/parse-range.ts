/**
 * Detects an explicit date-range request in the user's message (e.g. "90 day
 * summary", "last 30 days", "this month") so the chat context actually covers
 * the period the user is asking about, instead of always defaulting to 7 days.
 */
const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

function isoDate(year: number, month: number, day: number) {
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseLooseDate(value: string, fallbackYear?: number): string | null {
  const text = value.toLowerCase().replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/[,]+/g, ' ').trim()

  let m = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (m) return isoDate(Number(m[1]), Number(m[2]), Number(m[3]))

  m = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/)
  if (m) return isoDate(Number(m[3]), Number(m[2]), Number(m[1]))

  m = text.match(/\b(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?\b/)
  if (m) {
    const month = MONTHS[m[2]]
    const year = m[3] ? Number(m[3]) : fallbackYear
    if (month && year) return isoDate(year, month, Number(m[1]))
  }

  m = text.match(/\b([a-z]{3,9})\s+(\d{1,2})(?:\s+(\d{4}))?\b/)
  if (m) {
    const month = MONTHS[m[1]]
    const year = m[3] ? Number(m[3]) : fallbackYear
    if (month && year) return isoDate(year, month, Number(m[2]))
  }

  return null
}

export function parseExplicitDateRangeFromMessage(message: string): { from: string; to: string; label: string } | null {
  const normalized = message
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  const split = normalized.match(/(.+?)\s+(?:to|till|until|through|se|sy|say|-)\s+(.+)/i)
  if (!split) return null

  const left = split[1]
  const right = split[2]
  const rightYear = right.match(/\b(20\d{2}|19\d{2})\b/)?.[1]
  const leftYear = left.match(/\b(20\d{2}|19\d{2})\b/)?.[1]
  const fallbackYear = rightYear ? Number(rightYear) : leftYear ? Number(leftYear) : new Date().getFullYear()

  const from = parseLooseDate(left, fallbackYear)
  const to = parseLooseDate(right, fallbackYear)
  if (!from || !to) return null

  return from <= to
    ? { from, to, label: `${from}_to_${to}` }
    : { from: to, to: from, label: `${to}_to_${from}` }
}

export function parseRangeDaysFromMessage(message: string): number | null {
  const text = message.toLowerCase()

  const numeric = text.match(/\b(\d{1,3})\s*[- ]?\s*day/)
  if (numeric) {
    const n = parseInt(numeric[1], 10)
    if (n > 0 && n <= 365) return n
  }

  if (/\btoday\b/.test(text)) return 0
  if (/\byesterday\b/.test(text)) return 1
  if (/\bthis week\b|\blast week\b/.test(text)) return 7
  if (/\bthis month\b|\blast month\b/.test(text)) return 30
  if (/\bthis quarter\b|\blast quarter\b|\bquarter\b/.test(text)) return 90
  if (/\bthis year\b|\blast year\b/.test(text)) return 365

  return null
}
