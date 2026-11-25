import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../data/exercises'
import { VOCAB } from '../data/vocab'
import { analyse, classify, levelOf, tenseOf } from './analysis'
import type { Attempt } from './db'

const ex = (pred: (e: (typeof EXERCISES)[number]) => boolean) => EXERCISES.find(pred)!
let ts = 1
const att = (itemId: string, answer: string, extra: Partial<Attempt> = {}): Attempt => ({
  id: String(ts),
  date: '2026-11-20',
  ts: ts++,
  itemId,
  topic: EXERCISES.find((e) => e.id === itemId)?.topic,
  source: 'drill',
  correct: false,
  answer,
  ...extra,
})

describe('classify', () => {
  it('recognises the main mistake types', () => {
    const fui = ex((e) => e.type === 'gap' && e.answers[0] === 'fui' && e.topic === 'preterite')
    expect(classify(att(fui.id, 'fue'))?.category).toBe('verb-form')
    const iba = ex((e) => e.type === 'gap' && e.answers[0] === 'contaba')
    expect(classify(att(iba.id, 'contó'))?.category).toBe('tense-mood')
    const conoci = ex((e) => e.type === 'gap' && e.answers[0] === 'Conocí')
    expect(classify(att(conoci.id, 'conocía'))?.category).toBe('tense-mood')
    expect(classify(att(conoci.id, 'conocia'))?.category).toBe('tense-mood')
    const vengas = ex((e) => e.type === 'gap' && e.answers[0] === 'vengas')
    expect(classify(att(vengas.id, 'vienes'))?.category).toBe('tense-mood')
    expect(classify(att(vengas.id, 'venga'))?.category).toBe('verb-form')
    const dijeron = ex((e) => e.type === 'gap' && e.answers[0] === 'trajeron')
    expect(classify(att(dijeron.id, 'trajieron'))?.category).toBe('verb-form')
    const pair = ex((e) => e.type === 'pair' && e.topic === 'pret-imp')
    expect(classify(att(pair.id, pair.options!.find((o) => o !== pair.answers[0])!))?.category).toBe('tense-mood')
    const pp = ex((e) => e.type === 'pair' && e.topic === 'por-para')
    expect(classify(att(pp.id, 'para'))?.category).toBe('preposition')
    const lo = ex((e) => e.type === 'gap' && e.topic === 'obj-pronouns' && e.answers[0] === 'lo')
    expect(classify(att(lo.id, 'le'))?.category).toBe('pronoun')
    const order = ex((e) => e.type === 'unscramble')
    expect(classify(att(order.id, 'x'))?.category).toBe('word-order')
    const que = ex((e) => e.type === 'translate' && e.answers[0] === 'Quiero que me ayudes.')
    expect(classify(att(que.id, 'Quiero me ayudes'))?.category).toBe('missing-word')
    expect(classify(att(que.id, 'Quiero que me ayudes', { correct: true, score: 1 }))).toBeNull()
    expect(classify(att(que.id, 'Quiero que me ayudas', { score: 0.5, flags: ['spelling'] }))?.category).toBe('spelling')
    expect(classify(att(que.id, 'Quiero que me ayudes', { correct: true, score: 1, flags: ['accent'] }))?.category).toBe('accent')
  })
  it('classifies vocabulary misses', () => {
    const v = VOCAB[0]
    expect(classify({ ...att(v.id, 'nada'), source: 'vocab', topic: undefined })?.category).toBe('vocabulary')
  })
})

describe('tenseOf', () => {
  it('detects common tenses', () => {
    expect(['fui', 'contó', 'conocí', 'dijeron', 'hablaron'].map(tenseOf)).toEqual(['preterite', 'preterite', 'preterite', 'preterite', 'preterite'])
    expect(['contaba', 'conocía', 'iba', 'era'].map(tenseOf)).toEqual(['imperfect', 'imperfect', 'imperfect', 'imperfect'])
    expect(['hablaría', 'tuviera', 'hablará'].map(tenseOf)).toEqual(['conditional', 'imp-subjunctive', 'future'])
  })
})

describe('analyse', () => {
  it('gives levels, trends, focus topics and missed words', () => {
    const pi = EXERCISES.filter((e) => e.topic === 'pret-imp')
    const se = EXERCISES.filter((e) => e.topic === 'ser-estar')
    const attempts: Attempt[] = []
    // pret-imp: older answers mostly wrong, recent ones mostly right → building + trend up
    pi.slice(0, 30).forEach((e, i) => attempts.push(att(e.id, 'x', { ts: i, correct: i >= 15 ? i % 3 !== 0 : i % 4 === 0, score: undefined })))
    se.slice(0, 20).forEach((e, i) => attempts.push(att(e.id, e.answers[0], { ts: 100 + i, correct: true })))
    const v = VOCAB[3]
    attempts.push({ ...att(v.id, 'mal'), source: 'vocab', topic: undefined }, { ...att(v.id, 'mal'), source: 'vocab', topic: undefined })
    const r = analyse(attempts)
    const pir = r.topics.find((t) => t.topic === 'pret-imp')!
    expect(pir.n).toBe(30)
    expect(pir.trend).toBe('up')
    expect(['needs-work', 'building']).toContain(pir.level)
    expect(r.topics.find((t) => t.topic === 'ser-estar')!.level).toBe('strong')
    expect(r.focus[0].topic).toBe('pret-imp')
    expect(r.missedWords[0]).toMatchObject({ id: v.id, misses: 2 })
    expect(r.categories.length).toBeGreaterThan(0)
  })
  it('levels', () => {
    expect(levelOf(0.9, 3)).toBe('none')
    expect(levelOf(0.4, 10)).toBe('needs-work')
    expect(levelOf(0.6, 10)).toBe('building')
    expect(levelOf(0.8, 10)).toBe('good')
    expect(levelOf(0.9, 10)).toBe('strong')
  })
})
