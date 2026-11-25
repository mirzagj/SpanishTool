import { describe, expect, it } from 'vitest'
import { EXERCISES_BY_TOPIC } from '../data/exercises'
import type { Attempt, DayRecord } from './db'
import { BLOCKS } from './db'
import { buildDay, curriculumAt, dayStatus, offsetForTopic, reachedTopics, streaks, topicAccuracy, weakestTopic } from './plan'
import { buildDrillQueue } from './select'
import { DEFAULT_SETTINGS } from './settings'
import { schedule, NEW_SRS } from './srs'

const mkDay = (date: string, done: Partial<Record<string, boolean>>, extra: Partial<DayRecord> = {}): DayRecord => ({
  date,
  dayType: 'topic',
  topic: 'pret-imp',
  call: false,
  light: false,
  theme: 'daily',
  created: 0,
  blocks: BLOCKS.map((kind) => ({ kind, minutes: 5, done: !!done[kind], seconds: 0 })),
  ...extra,
})
const all = { review: true, drills: true, vocab: true, writing: true, speaking: true }

describe('dayStatus', () => {
  it('classifies days', () => {
    expect(dayStatus(undefined)).toBe('none')
    expect(dayStatus(mkDay('2026-01-01', {}))).toBe('none')
    expect(dayStatus(mkDay('2026-01-01', { vocab: true }))).toBe('partial')
    expect(dayStatus(mkDay('2026-01-01', { review: true, drills: true }, { light: true }))).toBe('light')
    expect(dayStatus(mkDay('2026-01-01', all))).toBe('full')
  })
})

describe('streaks', () => {
  it('counts current and longest streaks; today not yet done keeps yesterday’s streak', () => {
    const days = [
      mkDay('2026-01-01', all),
      mkDay('2026-01-02', all),
      mkDay('2026-01-03', all),
      mkDay('2026-01-05', { review: true, drills: true }, { light: true }),
      mkDay('2026-01-06', all),
      mkDay('2026-01-07', { vocab: true }),
    ]
    expect(streaks(days, '2026-01-07')).toEqual({ current: 2, longest: 3 })
    expect(streaks(days, '2026-01-09')).toEqual({ current: 0, longest: 3 })
  })
})

describe('curriculum', () => {
  it('advances by topic days and handles the offset', () => {
    const s = DEFAULT_SETTINGS
    expect(curriculumAt(s, 0)).toMatchObject({ topic: 'present-irregular', day: 1, of: 2 })
    expect(curriculumAt(s, 2)).toMatchObject({ topic: 'ser-estar', day: 1 })
    expect(curriculumAt(s, 6)).toMatchObject({ topic: 'pret-imp', day: 1, of: 8 })
    const off = offsetForTopic(s, 3, 1)
    expect(curriculumAt({ ...s, curriculumOffset: off }, 1)).toMatchObject({ topic: 'pret-imp', day: 1 })
    expect(curriculumAt(s, 999).finished).toBe(true)
    expect(reachedTopics(s, curriculumAt(s, 4))).toEqual(['present-irregular', 'ser-estar', 'preterite'])
  })
  it('builds a day from the weekly template', () => {
    // 2026-11-23 is a Monday → topic day; Thursday → structure; Saturday → call
    const d = buildDay('2026-11-23', DEFAULT_SETTINGS, [], [])
    expect(d.dayType).toBe('topic')
    expect(d.topic).toBe('present-irregular')
    expect(d.blocks.map((b) => b.minutes)).toEqual([8, 12, 8, 7, 10])
    expect(buildDay('2026-11-26', DEFAULT_SETTINGS, [], []).dayType).toBe('structure')
    expect(buildDay('2026-11-28', DEFAULT_SETTINGS, [], []).call).toBe(true)
  })
})

describe('adaptive selection', () => {
  const att = (topic: string, correct: boolean, i: number): Attempt => ({
    date: '2026-01-01',
    ts: i,
    itemId: `${topic}:${i}`,
    topic: topic as Attempt['topic'],
    source: 'drill',
    correct,
    answer: '',
  })
  it('finds the weakest topic', () => {
    const attempts = [
      ...Array.from({ length: 10 }, (_, i) => att('ser-estar', i < 9, i)),
      ...Array.from({ length: 10 }, (_, i) => att('preterite', i < 3, i)),
    ]
    const acc = topicAccuracy(attempts)
    expect(acc['preterite'].acc).toBeCloseTo(0.3)
    expect(weakestTopic(['ser-estar', 'preterite'], acc, '2026-01-01')).toBe('preterite')
  })
  it('puts ~60% of a topic-day queue on today’s topic and weak topics show up more', () => {
    const attempts = [
      ...Array.from({ length: 20 }, (_, i) => att('ser-estar', true, i)),
      ...Array.from({ length: 20 }, (_, i) => att('preterite', false, i)),
    ]
    const acc = topicAccuracy(attempts)
    let seed = 1
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const day = mkDay('2026-01-01', {}, { topic: 'pret-imp' })
    let pret = 0
    let ser = 0
    for (let k = 0; k < 20; k++) {
      const q = buildDrillQueue({ day, reached: ['present-irregular', 'ser-estar', 'preterite', 'pret-imp'], attempts, acc, count: 12, rand })
      expect(q).toHaveLength(12)
      expect(new Set(q.map((e) => e.id)).size).toBe(12)
      expect(q.filter((e) => e.topic === 'pret-imp').length).toBeGreaterThanOrEqual(7)
      pret += q.filter((e) => e.topic === 'preterite').length
      ser += q.filter((e) => e.topic === 'ser-estar').length
    }
    expect(pret).toBeGreaterThan(ser)
  })
  it('structure days favour structure topics', () => {
    const q = buildDrillQueue({ day: mkDay('2026-01-01', {}, { dayType: 'structure' }), reached: ['present-irregular'], attempts: [], acc: {}, count: 12 })
    expect(q).toHaveLength(12)
    expect(q.filter((e) => ['obj-pronouns', 'double-pronouns', 'connectors', 'relatives', 'se-passive', 'word-order'].includes(e.topic) || e.type === 'unscramble').length).toBe(12)
  })
  it('every topic has exercises', () => {
    expect(Object.keys(EXERCISES_BY_TOPIC)).toHaveLength(18)
  })
})

describe('SM-2', () => {
  it('grows intervals on success and resets on failure', () => {
    let s = NEW_SRS('2026-01-01')
    s = schedule(s, 4, '2026-01-01')
    expect(s).toMatchObject({ interval: 1, reps: 1, due: '2026-01-02' })
    s = schedule(s, 4, '2026-01-02')
    expect(s).toMatchObject({ interval: 3, reps: 2, due: '2026-01-05' })
    s = schedule(s, 4, '2026-01-05')
    expect(s.interval).toBeGreaterThanOrEqual(7)
    const failed = schedule(s, 1, '2026-01-12')
    expect(failed).toMatchObject({ interval: 1, reps: 0, lapses: 1, due: '2026-01-13' })
    expect(failed.ef).toBeLessThan(s.ef)
    expect(failed.ef).toBeGreaterThanOrEqual(1.3)
  })
})
