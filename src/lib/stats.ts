import type { TopicId } from '../data/types'
import { addDays, weekStart } from './dates'
import type { Attempt, DayRecord, LogEntry } from './db'
import { minutesPractised } from './plan'

/** The last `n` week-start dates (Mondays) up to and including the current week. */
export function lastWeeks(today: string, n: number): string[] {
  const cur = weekStart(today)
  return Array.from({ length: n }, (_, i) => addDays(cur, (i - n + 1) * 7))
}

/** Weekly accuracy (0–100) for all grammar attempts, or for one topic. null = no attempts that week. */
export function weeklyAccuracy(attempts: Attempt[], weeks: string[], topic?: TopicId): (number | null)[] {
  const acc = new Map<string, { n: number; c: number }>()
  for (const a of attempts) {
    if (a.source === 'vocab' || !a.topic) continue
    if (topic && a.topic !== topic) continue
    const w = weekStart(a.date)
    const x = acc.get(w) ?? { n: 0, c: 0 }
    x.n++
    if (a.correct) x.c++
    acc.set(w, x)
  }
  return weeks.map((w) => {
    const x = acc.get(w)
    return x && x.n ? Math.round((x.c / x.n) * 100) : null
  })
}

export function minutesPerWeek(days: DayRecord[], logs: LogEntry[], weeks: string[]): { core: number[]; bonus: number[] } {
  const core = new Map<string, number>()
  const bonus = new Map<string, number>()
  for (const d of days) {
    const w = weekStart(d.date)
    core.set(w, (core.get(w) ?? 0) + minutesPractised(d))
  }
  for (const l of logs) {
    if (l.type === 'call') continue
    const w = weekStart(l.date)
    bonus.set(w, (bonus.get(w) ?? 0) + l.minutes)
  }
  return { core: weeks.map((w) => Math.round(core.get(w) ?? 0)), bonus: weeks.map((w) => Math.round(bonus.get(w) ?? 0)) }
}
