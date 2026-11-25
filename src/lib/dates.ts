/** All dates are local calendar days as 'YYYY-MM-DD' strings. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr(): string {
  return toStr(new Date())
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return toStr(d)
}

/** b - a in whole days. */
export function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIdx(s: string): number {
  return (parse(s).getDay() + 6) % 7
}

export function weekStart(s: string): string {
  return addDays(s, -weekdayIdx(s))
}

/** Days since 1970-01-01 (stable, timezone independent). */
export function dayNumber(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function fmtLong(s: string): string {
  const d = parse(s)
  return `${WEEKDAYS_LONG[weekdayIdx(s)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function fmtShort(s: string): string {
  const d = parse(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

/** 6x7 grid of date strings for a month view (Monday first), plus whether each is in the month. */
export function monthGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = toStr(new Date(year, month, 1))
  const start = weekStart(first)
  const out: { date: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const date = addDays(start, i)
    out.push({ date, inMonth: parse(date).getMonth() === month })
  }
  // drop a trailing empty week
  if (!out.slice(35).some((c) => c.inMonth)) out.length = 35
  return out
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${pad(s % 60)}`
}
