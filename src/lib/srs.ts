import { addDays } from './dates'

export interface SrsState {
  ef: number
  interval: number
  reps: number
  lapses: number
  due: string
  last?: string
}

export const NEW_SRS = (due: string): SrsState => ({ ef: 2.5, interval: 0, reps: 0, lapses: 0, due })

/** Grades used by the app (SM-2 quality 0–5). */
export const GRADE = { wrong: 1, hard: 3, good: 4, easy: 5 } as const

/**
 * Simple SM-2. Intervals: 1 day, 3 days, then interval × ease factor.
 * A wrong answer resets the card to 1 day.
 */
export function schedule(s: SrsState, q: number, today: string): SrsState {
  let { ef, interval, reps, lapses } = s
  if (q < 3) {
    reps = 0
    interval = 1
    lapses += 1
  } else {
    reps += 1
    if (reps === 1) interval = 1
    else if (reps === 2) interval = 3
    else interval = Math.max(interval + 1, Math.round(interval * ef))
  }
  ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  ef = Math.round(ef * 100) / 100
  return { ef, interval, reps, lapses, due: addDays(today, interval), last: today }
}

export const MATURE_DAYS = 21
export const isMature = (s: { interval: number }) => s.interval >= MATURE_DAYS
