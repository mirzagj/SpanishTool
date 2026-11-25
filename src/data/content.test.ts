import { describe, expect, it } from 'vitest'
import { normalize, unscrambleWords } from '../lib/check'
import { EXERCISES, EXERCISES_BY_TOPIC } from './exercises'
import { TOPICS } from './topics'

describe('grammar exercises', () => {
  it('has at least 25 exercises for every topic', () => {
    for (const t of TOPICS) {
      expect(EXERCISES_BY_TOPIC[t.id]?.length ?? 0, t.id).toBeGreaterThanOrEqual(25)
    }
  })

  it('uses every exercise type in every topic', () => {
    for (const t of TOPICS) {
      const types = new Set(EXERCISES_BY_TOPIC[t.id].map((e) => e.type))
      expect([...types].sort(), t.id).toEqual(['gap', 'pair', 'rewrite', 'translate', 'unscramble'])
    }
  })

  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every exercise has answers and a one-line explanation', () => {
    for (const e of EXERCISES) {
      expect(e.answers.length, e.id).toBeGreaterThan(0)
      expect(e.explain.length, e.id).toBeGreaterThan(5)
      expect(e.explain.includes('\n'), e.id).toBe(false)
      expect(new Set(e.answers.map((a) => normalize(a, true))).size, `duplicate answers in ${e.id}`).toBe(e.answers.length)
    }
  })

  it('gap and pair sentences contain exactly one gap', () => {
    for (const e of EXERCISES.filter((x) => x.type === 'gap' || x.type === 'pair')) {
      expect(e.prompt.split('___').length - 1, e.prompt).toBe(1)
    }
  })

  it('pairs have two options including the answer', () => {
    for (const e of EXERCISES.filter((x) => x.type === 'pair')) {
      expect(e.options, e.prompt).toHaveLength(2)
      expect(e.options, e.prompt).toContain(e.answers[0])
    }
  })

  it('translations have Dutch and English prompts', () => {
    for (const e of EXERCISES.filter((x) => x.type === 'translate')) {
      expect(e.nl, e.id).toBeTruthy()
      expect(e.en, e.id).toBeTruthy()
    }
  })

  it('rewrites have an instruction and a source sentence', () => {
    for (const e of EXERCISES.filter((x) => x.type === 'rewrite')) {
      expect(e.instr, e.id).toBeTruthy()
      expect(e.prompt, e.id).toBeTruthy()
    }
  })

  it('unscramble alternatives use exactly the same words', () => {
    for (const e of EXERCISES.filter((x) => x.type === 'unscramble')) {
      const bag = (s: string) => unscrambleWords(s).map((w) => normalize(w, true)).sort().join(' ')
      const base = bag(e.answers[0])
      for (const a of e.answers) expect(bag(a), a).toBe(base)
      expect(unscrambleWords(e.answers[0]).length, e.answers[0]).toBeGreaterThanOrEqual(3)
    }
  })

  it('Spanish answers use correct inverted punctuation', () => {
    for (const e of EXERCISES) {
      for (const a of e.answers) {
        if (a.includes('?')) expect(a.includes('¿'), a).toBe(true)
      }
    }
  })
})
