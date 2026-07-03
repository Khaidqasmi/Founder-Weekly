/**
 * Detects an explicit date-range request in the user's message (e.g. "90 day
 * summary", "last 30 days", "this month") so the chat context actually covers
 * the period the user is asking about, instead of always defaulting to 7 days.
 */
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
