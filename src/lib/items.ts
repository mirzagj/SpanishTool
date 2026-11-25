import { EXERCISE_BY_ID } from '../data/exercises'
import { VOCAB_BY_ID, synonymsFor } from '../data/vocab'
import type { Exercise, TopicId, VocabItem } from '../data/types'
import { unscrambleWords, shuffleWords } from './check'
import type { Card } from './db'

/** Anything the practice card can show: a grammar exercise, a vocabulary card or a custom card. */
export interface PracticeItem {
  /** Key for user-added alternatives ("I was actually right"). */
  key: string
  mode: 'type' | 'unscramble' | 'pair'
  label: string
  instr?: string
  prompt: string
  sub?: string
  words?: string[]
  options?: string[]
  answers: string[]
  explain?: string
  spain?: string
  /** Shown after answering (e.g. the full example sentence). */
  after?: string
  articleLenient?: boolean
  /** Other words that also fit (vocabulary). */
  synonyms?: string[]
  /** How lenient the checker is: see CheckOptions.mode. */
  checkMode?: 'grammar' | 'vocab' | 'exact'
  hints?: boolean
  long?: boolean
  topic?: TopicId
}

const LABEL: Record<Exercise['type'], string> = {
  gap: 'Fill the gap',
  translate: 'Translate',
  rewrite: 'Rewrite',
  unscramble: 'Unscramble',
  pair: 'Choose & explain',
}

export function exercisePrompt(e: Exercise, lang: 'nl' | 'en'): string {
  if (e.type === 'translate') return (lang === 'nl' ? e.nl : e.en) ?? e.en ?? ''
  if (e.type === 'unscramble') return 'Build the sentence'
  return e.prompt
}

export function exerciseItem(e: Exercise, lang: 'nl' | 'en'): PracticeItem {
  const base: PracticeItem = {
    key: `ex:${e.id}`,
    mode: 'type',
    label: LABEL[e.type],
    prompt: exercisePrompt(e, lang),
    answers: e.answers,
    explain: e.explain,
    spain: e.spain,
    topic: e.topic,
  }
  switch (e.type) {
    case 'gap':
      return { ...base, instr: 'Type the missing word(s).' }
    case 'translate':
      return { ...base, instr: lang === 'nl' ? 'Vertaal naar het Spaans (Mexicaans).' : 'Translate into (Mexican) Spanish.', long: true }
    case 'rewrite':
      return { ...base, instr: e.instr, long: true }
    case 'unscramble':
      return { ...base, mode: 'unscramble', checkMode: 'exact', instr: 'Tap the words in the right order.', words: shuffleWords(unscrambleWords(e.answers[0]), e.id) }
    case 'pair':
      return { ...base, mode: 'pair', checkMode: 'exact', instr: 'Choose, and say why.', options: e.options }
  }
}

/** "Anoche vimos [el partido] en casa." → { cloze: "Anoche vimos ___ en casa.", target: "el partido", full } */
export function splitExample(ex: string): { cloze: string; target: string; full: string } {
  const m = ex.match(/\[([^\]]+)\]/)
  const target = m ? m[1] : ''
  return { cloze: ex.replace(/\[[^\]]+\]/, '___'), target, full: ex.replace(/\[([^\]]+)\]/, '$1') }
}

export function vocabItem(v: VocabItem, lang: 'nl' | 'en'): PracticeItem {
  const { cloze, full } = splitExample(v.ex)
  return {
    key: `vo:${v.id}`,
    mode: 'type',
    label: 'Vocabulary',
    instr: lang === 'nl' ? v.nl : v.en,
    prompt: cloze,
    sub: lang === 'nl' ? v.en : v.nl,
    answers: [v.es, ...v.alts],
    after: full,
    spain: v.spain,
    articleLenient: true,
    synonyms: synonymsFor(v),
    checkMode: 'vocab',
    hints: true,
  }
}

export function customItem(c: Card): PracticeItem {
  return {
    key: `cu:${c.id}`,
    mode: 'type',
    label: c.source === 'series' ? 'From a series' : c.source === 'call' ? 'From your call' : c.source === 'writing' ? 'From your writing' : 'Your mistake',
    instr: c.front,
    prompt: c.context ?? '',
    answers: c.answers ?? [],
    explain: c.explain,
    hints: true,
    checkMode: (c.answers?.[0] ?? '').trim().includes(' ') ? 'grammar' : 'vocab',
    long: (c.answers?.[0]?.length ?? 0) > 25,
    topic: c.topic,
  }
}


/** Practice item for a review card, or null if its source content no longer exists. */
export function cardItem(c: Card, lang: 'nl' | 'en'): PracticeItem | null {
  if (c.kind === 'exercise') {
    const e = c.refId ? EXERCISE_BY_ID[c.refId] : undefined
    return e ? exerciseItem(e, lang) : null
  }
  if (c.kind === 'vocab') {
    const v = c.refId ? VOCAB_BY_ID[c.refId] : undefined
    return v ? vocabItem(v, lang) : null
  }
  return customItem(c)
}
