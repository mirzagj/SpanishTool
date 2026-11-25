import { STRUCTURE_TOPICS, TOPICS } from '../data/topics'
import type { TopicId } from '../data/types'
import { THEMES } from '../data/vocab/themes'
import { addDays, dayNumber, diffDays, weekdayIdx } from './dates'
import { BLOCKS, LIGHT_BLOCKS, db, type Attempt, type BlockKind, type DayRecord } from './db'
import { loadSettings, type Settings } from './settings'

// ---------- curriculum ----------

export interface CurriculumPos {
  index: number
  topic: TopicId | null
  /** 1-based day within the topic */
  day: number
  of: number
  finished: boolean
}

export function curriculumAt(s: Settings, topicDaysDone: number): CurriculumPos {
  let n = Math.max(0, topicDaysDone + s.curriculumOffset)
  for (let i = 0; i < s.curriculum.length; i++) {
    const step = s.curriculum[i]
    if (n < step.days) return { index: i, topic: step.topic, day: n + 1, of: step.days, finished: false }
    n -= step.days
  }
  return { index: s.curriculum.length, topic: null, day: 0, of: 0, finished: true }
}

/** Offset needed so that the curriculum starts `topicIndex` today. */
export function offsetForTopic(s: Settings, topicIndex: number, topicDaysDone: number): number {
  let target = 0
  for (let i = 0; i < topicIndex && i < s.curriculum.length; i++) target += s.curriculum[i].days
  return target - topicDaysDone
}

export function reachedTopics(s: Settings, pos: CurriculumPos): TopicId[] {
  if (pos.finished) return TOPICS.map((t) => t.id)
  return s.curriculum.slice(0, pos.index + 1).map((c) => c.topic)
}

export function countTopicDaysDone(days: DayRecord[], before: string): number {
  return days.filter((d) => d.date < before && d.dayType === 'topic' && d.blocks.find((b) => b.kind === 'drills')?.done).length
}

// ---------- accuracy ----------

export interface TopicAcc {
  n: number
  correct: number
  acc: number
}

/** Recent accuracy per topic (last `window` graded attempts on grammar items). */
export function topicAccuracy(attempts: Attempt[], window = 30): Record<string, TopicAcc> {
  const by: Record<string, Attempt[]> = {}
  for (const a of attempts) {
    if (!a.topic || a.source === 'vocab') continue
    ;(by[a.topic] ||= []).push(a)
  }
  const out: Record<string, TopicAcc> = {}
  for (const [t, list] of Object.entries(by)) {
    const recent = list.sort((x, y) => x.ts - y.ts).slice(-window)
    const correct = recent.filter((a) => a.correct).length
    out[t] = { n: recent.length, correct, acc: recent.length ? correct / recent.length : 0 }
  }
  return out
}

/** Accuracy used for weighting: unknown topics count as 0.7. */
export const accOf = (acc: Record<string, TopicAcc>, t: TopicId) => (acc[t] && acc[t].n >= 4 ? acc[t].acc : 0.7)

/** Weakest topic among candidates; ties rotate by date so you get variety. */
export function weakestTopic(cands: TopicId[], acc: Record<string, TopicAcc>, date: string): TopicId {
  const rot = dayNumber(date)
  const scored = cands.map((t, i) => ({ t, s: accOf(acc, t) + (((i + rot) % cands.length) / cands.length) * 0.001 }))
  scored.sort((a, b) => a.s - b.s)
  return scored[0].t
}

// ---------- day plan ----------

export const themeFor = (date: string) => THEMES[dayNumber(date) % THEMES.length].id

export function buildDay(date: string, s: Settings, days: DayRecord[], attempts: Attempt[]): DayRecord {
  const pos = curriculumAt(s, countTopicDaysDone(days, date))
  const reached = reachedTopics(s, pos)
  const acc = topicAccuracy(attempts)
  const wp = s.week[weekdayIdx(date)]
  let topic: TopicId
  if (wp.type === 'topic') topic = pos.topic ?? weakestTopic(reached, acc, date)
  else if (wp.type === 'structure') topic = weakestTopic(STRUCTURE_TOPICS, acc, date)
  else topic = weakestTopic(reached, acc, date)
  return {
    date,
    dayType: wp.type,
    topic,
    pos: wp.type === 'topic' && !pos.finished ? { day: pos.day, of: pos.of } : undefined,
    call: wp.call,
    light: false,
    theme: themeFor(date),
    blocks: BLOCKS.map((kind) => ({ kind, minutes: s.blockMinutes[kind], done: false, seconds: 0 })),
    created: Date.now(),
  }
}

/** Get today's plan, creating it from the weekly template the first time. */
export async function ensureDay(date: string): Promise<DayRecord> {
  const existing = await db.days.get(date)
  if (existing) return existing
  const [s, days, attempts] = await Promise.all([
    loadSettings(),
    db.days.toArray(),
    db.attempts.where('date').aboveOrEqual(addDays(date, -60)).toArray(),
  ])
  const rec = buildDay(date, s, days, attempts)
  await db.transaction('rw', db.days, async () => {
    if (!(await db.days.get(date))) await db.days.put(rec)
  })
  return (await db.days.get(date))!
}

/** Rebuild a day from the current template, keeping blocks already done. */
export async function rebuildDay(date: string): Promise<void> {
  const [s, days, attempts, old] = await Promise.all([loadSettings(), db.days.toArray(), db.attempts.toArray(), db.days.get(date)])
  const rec = buildDay(date, s, days, attempts)
  if (old) {
    rec.light = old.light
    rec.blocks = rec.blocks.map((b) => {
      const o = old.blocks.find((x) => x.kind === b.kind)
      return o ? { ...b, done: o.done, seconds: o.seconds } : b
    })
  }
  await db.days.put(rec)
}

export async function setBlockDone(date: string, kind: BlockKind, done: boolean) {
  await db.days
    .where('date')
    .equals(date)
    .modify((d) => {
      const b = d.blocks.find((x) => x.kind === kind)
      if (b) b.done = done
    })
}

export async function addBlockSeconds(date: string, kind: BlockKind, secs: number) {
  if (secs <= 0) return
  await db.days
    .where('date')
    .equals(date)
    .modify((d) => {
      const b = d.blocks.find((x) => x.kind === kind)
      if (b) b.seconds += secs
    })
}

export async function setLight(date: string, light: boolean) {
  await db.days.update(date, { light })
}

export const activeBlocks = (d: DayRecord) => (d.light ? d.blocks.filter((b) => LIGHT_BLOCKS.includes(b.kind)) : d.blocks)

// ---------- status & streaks ----------

export type DayStatus = 'full' | 'light' | 'partial' | 'none'

/**
 * full    = every core block done (dark green)
 * light   = the 20-min minimum (review + drills) done (light green)
 * partial = something done (yellow)
 */
export function dayStatus(d: DayRecord | undefined): DayStatus {
  if (!d) return 'none'
  const done = (k: BlockKind) => !!d.blocks.find((b) => b.kind === k)?.done
  if (d.blocks.every((b) => b.done)) return 'full'
  if (LIGHT_BLOCKS.every(done)) return 'light'
  if (d.blocks.some((b) => b.done)) return 'partial'
  return 'none'
}

export const isComplete = (d: DayRecord | undefined) => {
  const s = dayStatus(d)
  return s === 'full' || s === 'light'
}

export function streaks(days: DayRecord[], today: string): { current: number; longest: number } {
  const good = new Set(days.filter(isComplete).map((d) => d.date))
  let current = 0
  let d = good.has(today) ? today : addDays(today, -1)
  while (good.has(d)) {
    current++
    d = addDays(d, -1)
  }
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const s of [...good].sort()) {
    run = prev && diffDays(prev, s) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = s
  }
  return { current, longest }
}

/** Minutes practised on a day: timer time when used, otherwise the budget of blocks ticked off. */
export function minutesPractised(d: DayRecord): number {
  return d.blocks.reduce((sum, b) => sum + (b.seconds >= 60 ? b.seconds / 60 : b.done ? b.minutes : 0), 0)
}

/** Everything the adaptive drill engine needs for a given date. */
export async function loadContext(date: string) {
  const [s, days, attempts] = await Promise.all([
    loadSettings(),
    db.days.toArray(),
    db.attempts.where('date').aboveOrEqual(addDays(date, -90)).toArray(),
  ])
  const pos = curriculumAt(s, countTopicDaysDone(days, date))
  return { s, days, attempts, pos, reached: reachedTopics(s, pos), acc: topicAccuracy(attempts) }
}
