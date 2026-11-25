import { EXERCISES_BY_TOPIC } from '../data/exercises'
import { STRUCTURE_TOPICS } from '../data/topics'
import type { Exercise, ExerciseType, TopicId } from '../data/types'
import type { Attempt, DayRecord } from './db'
import { accOf, type TopicAcc } from './plan'

interface ItemHistory {
  last: number
  lastCorrect: boolean
  n: number
}

function historyMap(attempts: Attempt[]): Record<string, ItemHistory> {
  const m: Record<string, ItemHistory> = {}
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    const h = (m[a.itemId] ||= { last: 0, lastCorrect: true, n: 0 })
    h.last = a.ts
    h.lastCorrect = a.correct
    h.n++
  }
  return m
}

/** Higher = should be practised sooner. */
function itemPriority(e: Exercise, hist: Record<string, ItemHistory>, now: number, rand: () => number): number {
  const h = hist[e.id]
  if (!h) return 3 + rand()
  if (!h.lastCorrect) return 2.5 + rand()
  const days = (now - h.last) / 86400000
  return Math.min(2, days / 7) + rand() * 0.6
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rand: () => number): T {
  const ws = items.map(weight)
  const total = ws.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < items.length; i++) {
    r -= ws[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

/** Topic weight for spiral review: low recent accuracy → appears more often. */
export const topicWeight = (acc: Record<string, TopicAcc>, t: TopicId) => 0.15 + (1 - accOf(acc, t)) * 1.5

export interface QueueOptions {
  day: DayRecord
  reached: TopicId[]
  attempts: Attempt[]
  acc: Record<string, TopicAcc>
  count: number
  exclude?: Set<string>
  rand?: () => number
  now?: number
}

/**
 * Build a drill queue.
 * - topic day: ~60% today's topic (varied exercise types), rest spiral review weighted by weakness
 * - mixed day: all weighted by weakness over the topics reached so far
 * - structure day: structure topics weighted by weakness + unscramble items from reached topics
 */
export function buildDrillQueue(o: QueueOptions): Exercise[] {
  const rand = o.rand ?? Math.random
  const now = o.now ?? Date.now()
  const hist = historyMap(o.attempts)
  const used = new Set<string>(o.exclude ?? [])
  const out: Exercise[] = []

  const takeFrom = (pool: Exercise[], preferType?: ExerciseType): Exercise | null => {
    let cands = pool.filter((e) => !used.has(e.id))
    if (!cands.length) return null
    if (preferType) {
      const typed = cands.filter((e) => e.type === preferType)
      if (typed.length) cands = typed
    }
    cands.sort((a, b) => itemPriority(b, hist, now, rand) - itemPriority(a, hist, now, rand))
    const e = cands[0]
    used.add(e.id)
    return e
  }

  const fromTopics = (topics: TopicId[], n: number, unscrambleBoost = false) => {
    const live = topics.filter((t) => EXERCISES_BY_TOPIC[t]?.length)
    for (let i = 0; i < n && live.length; i++) {
      const t = weightedPick(live, (x) => topicWeight(o.acc, x), rand)
      const e = takeFrom(EXERCISES_BY_TOPIC[t], unscrambleBoost && rand() < 0.5 ? 'unscramble' : undefined)
      if (e) out.push(e)
      else {
        live.splice(live.indexOf(t), 1)
        i--
      }
    }
  }

  if (o.day.dayType === 'topic') {
    const main = Math.round(o.count * 0.6)
    const types: ExerciseType[] = ['gap', 'translate', 'gap', 'rewrite', 'pair', 'unscramble']
    for (let i = 0; i < main; i++) {
      const e = takeFrom(EXERCISES_BY_TOPIC[o.day.topic] ?? [], types[i % types.length])
      if (e) out.push(e)
    }
    const others = o.reached.filter((t) => t !== o.day.topic)
    if (others.length) fromTopics(others, o.count - out.length)
    // top up from today's topic if needed
    while (out.length < o.count) {
      const e = takeFrom(EXERCISES_BY_TOPIC[o.day.topic] ?? [])
      if (!e) break
      out.push(e)
    }
    return interleave(out, o.day.topic, rand)
  }

  if (o.day.dayType === 'structure') {
    const structN = Math.round(o.count * 0.7)
    fromTopics(STRUCTURE_TOPICS, structN, true)
    const pool = o.reached.flatMap((t) => (EXERCISES_BY_TOPIC[t] ?? []).filter((e) => e.type === 'unscramble'))
    while (out.length < o.count) {
      const e = takeFrom(pool) ?? takeFrom(STRUCTURE_TOPICS.flatMap((t) => EXERCISES_BY_TOPIC[t] ?? []))
      if (!e) break
      out.push(e)
    }
    return shuffle(out, rand)
  }

  fromTopics(o.reached, o.count)
  return out
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Start with two of today's topic, then mix in review items. */
function interleave(items: Exercise[], topic: TopicId, rand: () => number): Exercise[] {
  const main = items.filter((e) => e.topic === topic)
  const rest = shuffle(
    items.filter((e) => e.topic !== topic),
    rand,
  )
  const out: Exercise[] = main.splice(0, 2)
  while (main.length || rest.length) {
    if (main.length) out.push(main.shift()!)
    if (rest.length && (rand() < 0.5 || !main.length)) out.push(rest.shift()!)
  }
  return out
}
