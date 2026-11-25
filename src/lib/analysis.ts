/**
 * Mistake analysis: level per topic, trend, the kinds of mistakes you make (with examples),
 * what to practise next, and the vocabulary you keep missing. Purely computed from your
 * stored answers, so it also works on history recorded before this feature existed.
 */
import { EXERCISE_BY_ID } from '../data/exercises'
import { TOPICS } from '../data/topics'
import type { Exercise, TopicId } from '../data/types'
import { VOCAB_BY_ID } from '../data/vocab'
import { levenshtein, normalize } from './check'
import { scoreOf, type Attempt, type Mistake } from './db'

export type Level = 'none' | 'needs-work' | 'building' | 'good' | 'strong'
export type Trend = 'up' | 'down' | 'flat' | null

export type Category =
  | 'tense-mood'
  | 'verb-form'
  | 'pronoun'
  | 'preposition'
  | 'article'
  | 'word-order'
  | 'missing-word'
  | 'word-choice'
  | 'spelling'
  | 'accent'
  | 'vocabulary'
  | 'other'

export const CATEGORY_LABEL: Record<Category, string> = {
  'tense-mood': 'Tense / mood choice',
  'verb-form': 'Verb form & endings',
  pronoun: 'Pronouns',
  preposition: 'Prepositions',
  article: 'Articles & gender',
  'word-order': 'Word order',
  'missing-word': 'Missing or extra words',
  'word-choice': 'Word choice',
  spelling: 'Spelling slips',
  accent: 'Accents',
  vocabulary: 'Vocabulary',
  other: 'Several things at once',
}

export const CATEGORY_HINT: Record<Category, string> = {
  'tense-mood': 'e.g. imperfect vs preterite, indicative vs subjunctive',
  'verb-form': 'right verb, wrong ending / person / irregular form',
  pronoun: 'lo / le / se / me…, and where they go',
  preposition: 'por / para, a, de, en…',
  article: 'el / la / un / una and agreement',
  'word-order': 'the right words in the wrong order',
  'missing-word': 'a forgotten que, a, se… or one word too many',
  'word-choice': 'ser / estar, saber / conocer, pero / sino…',
  spelling: 'b / v, s / z / c, h, ll / y… (half credit)',
  accent: 'missing or misplaced accents',
  vocabulary: "words you couldn't produce yet",
  other: 'answers with more than one difference',
}

/** Topics where choosing the tense or mood is the point. */
const TENSE_TOPICS = new Set<TopicId>(['preterite', 'pret-imp', 'perf-pret', 'pluperfect', 'fut-cond', 'subj-present', 'subj-imperfect', 'si-clauses', 'reported'])
/** Topics where indicative vs subjunctive is the point. */
const MOOD_TOPICS = new Set<TopicId>(['subj-present', 'subj-imperfect', 'si-clauses'])

const IRREG_PRET = new Set(
  'fui fuiste fue fuimos fueron tuve tuviste tuvo tuvimos tuvieron estuve estuviste estuvo estuvimos estuvieron hice hiciste hizo hicimos hicieron dije dijiste dijo dijimos dijeron pude pudiste pudo pudimos pudieron puse pusiste puso pusimos pusieron quise quisiste quiso quisimos quisieron vine viniste vino vinimos vinieron supe supiste supo supimos supieron traje trajiste trajo trajimos trajeron di dio dimos dieron vi vio vimos vieron anduve anduvo'.split(' '),
)
const IRREG_IMPF = new Set('era eras éramos eran iba ibas íbamos iban veía veías veíamos veían'.split(' '))

/** Rough tense of a single verb form (accented, lower-case). undefined = can't tell. */
export function tenseOf(w: string): string | undefined {
  const s = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (IRREG_PRET.has(s) || IRREG_PRET.has(w)) return 'preterite'
  if (IRREG_IMPF.has(w) || IRREG_IMPF.has(s)) return 'imperfect'
  if (/(ría|rías|ríamos|rían)$/.test(w) || /(ria|rias|riamos|rian)$/.test(s)) return 'conditional'
  if (/(ré|rás|rá|remos|rán)$/.test(w)) return 'future'
  if (/(aba|abas|abamos|aban|ia|ias|iamos|ian)$/.test(s)) return 'imperfect'
  if (/(iera|ieras|ieramos|ieran|iese|ieses|ara|aras|aramos|aran|ase|ases|uera|ueras|ueran)$/.test(s)) return 'imp-subjunctive'
  if (/(é|ó|í|ió)$/.test(w) || /(aste|asteis|aron|iste|isteis|ieron|eron)$/.test(s)) return 'preterite'
  if (/(o|as|a|amos|an|es|e|emos|en|imos)$/.test(s)) return 'present'
  return undefined
}
const VERB_TOPICS = new Set<TopicId>([...TENSE_TOPICS, 'present-irregular', 'ser-estar'])

const PRONOUNS = new Set(['me', 'te', 'se', 'nos', 'os', 'lo', 'la', 'los', 'las', 'le', 'les', 'yo', 'tu', 'el', 'ella', 'usted', 'nosotros', 'ustedes', 'ellos', 'ellas', 'mi', 'ti', 'si'])
const PREPOSITIONS = new Set(['a', 'al', 'de', 'del', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'desde', 'hasta', 'entre', 'hacia', 'contra'])
const ARTICLES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo'])

const words = (s: string) => normalize(s, false).split(' ').filter(Boolean)
const wordsAccented = (s: string) => normalize(s, true).split(' ').filter(Boolean)

function closestAnswer(user: string, answers: string[]): string {
  const u = normalize(user, false)
  let best = answers[0] ?? ''
  let bestD = Infinity
  for (const a of answers) {
    const d = levenshtein(u, normalize(a, false))
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return best
}

function wordClass(w: string): 'pronoun' | 'preposition' | 'article' | null {
  if (PREPOSITIONS.has(w)) return 'preposition'
  if (ARTICLES.has(w) && !PRONOUNS.has(w)) return 'article'
  if (PRONOUNS.has(w)) return 'pronoun'
  return null
}

/** Category of one answer that wasn't fully right (or was right with an accent slip). */
export function classify(a: Attempt): { category: Category; correct: string } | null {
  const flags = a.flags ?? []
  if (a.source === 'vocab') {
    const v = VOCAB_BY_ID[a.itemId]
    const correct = v?.es ?? ''
    if (scoreOf(a) === 1) return flags.includes('accent') ? { category: 'accent', correct } : null
    return { category: scoreOf(a) > 0 || flags.includes('spelling') ? 'spelling' : 'vocabulary', correct }
  }
  const e: Exercise | undefined = EXERCISE_BY_ID[a.itemId]
  if (!e) return null
  const correct = closestAnswer(a.answer, e.answers)
  if (scoreOf(a) === 1) return flags.includes('accent') ? { category: 'accent', correct } : null
  if (scoreOf(a) > 0 || flags.includes('spelling')) return { category: 'spelling', correct }
  if (flags.includes('accent')) return { category: 'accent', correct } // strict accent mode

  if (e.type === 'pair') {
    if (TENSE_TOPICS.has(e.topic)) return { category: 'tense-mood', correct }
    if (e.topic === 'por-para') return { category: 'preposition', correct }
    if (e.topic === 'obj-pronouns' || e.topic === 'double-pronouns') return { category: 'pronoun', correct }
    return { category: 'word-choice', correct }
  }
  if (e.type === 'unscramble') return { category: 'word-order', correct }

  const u = words(a.answer)
  const x = words(correct)
  if (!u.length) return { category: e.topic === 'word-order' ? 'word-order' : 'other', correct }
  // same words, different order
  if (u.length === x.length && [...u].sort().join(' ') === [...x].sort().join(' ')) return { category: 'word-order', correct }
  // one word missing or extra
  if (Math.abs(u.length - x.length) === 1) {
    const [long, short] = u.length > x.length ? [u, x] : [x, u]
    for (let i = 0; i < long.length; i++) {
      if ([...long.slice(0, i), ...long.slice(i + 1)].join(' ') === short.join(' ')) {
        const cls = wordClass(long[i])
        return { category: cls ?? 'missing-word', correct }
      }
    }
  }
  // exactly one word differs
  if (u.length === x.length) {
    const diff = x.map((_, i) => i).filter((i) => u[i] !== x[i])
    if (diff.length === 1) {
      const [p, q] = [u[diff[0]], x[diff[0]]]
      const cp = wordClass(p)
      const cq = wordClass(q)
      if (cp && cp === cq) return { category: cp, correct }
      if (cq === 'pronoun' || cp === 'pronoun') return { category: 'pronoun', correct }
      if (cq === 'preposition' || cp === 'preposition') return { category: 'preposition', correct }
      let pre = 0
      while (pre < p.length && pre < q.length && p[pre] === q[pre]) pre++
      const sameStem = pre >= 2 && p.length >= 2 && q.length >= 2
      if (TENSE_TOPICS.has(e.topic)) {
        // contó ↔ contaba: a different tense. fue ↔ fui: same tense, wrong person. vienes ↔ vengas: mood.
        const pa = wordsAccented(a.answer)[diff[0]] ?? p
        const qa = wordsAccented(correct)[diff[0]] ?? q
        const tu = tenseOf(pa)
        const tq = tenseOf(qa)
        if (tu && tq && tu !== tq) return { category: 'tense-mood', correct }
        if (pre >= Math.max(p.length, q.length) - 1) return { category: 'verb-form', correct }
        if (MOOD_TOPICS.has(e.topic)) return { category: 'tense-mood', correct }
        return { category: sameStem ? 'verb-form' : 'tense-mood', correct }
      }
      if (VERB_TOPICS.has(e.topic)) return { category: sameStem ? 'verb-form' : 'word-choice', correct }
      return { category: sameStem ? 'verb-form' : 'word-choice', correct }
    }
  }
  if (TENSE_TOPICS.has(e.topic) && Math.abs(u.length - x.length) <= 1) return { category: 'tense-mood', correct }
  return { category: 'other', correct }
}

export function levelOf(acc: number, n: number): Level {
  if (n < 5) return 'none'
  if (acc < 0.5) return 'needs-work'
  if (acc < 0.7) return 'building'
  if (acc < 0.85) return 'good'
  return 'strong'
}

export const LEVEL_LABEL: Record<Level, string> = {
  none: 'Not enough data',
  'needs-work': 'Needs work',
  building: 'Building',
  good: 'Good',
  strong: 'Strong',
}

export interface Example {
  you: string
  correct: string
  topic?: TopicId
  date: string
}

export interface CategoryReport {
  category: Category
  count: number
  examples: Example[]
}

export interface TopicReport {
  topic: TopicId
  n: number
  acc: number
  level: Level
  trend: Trend
  /** mistakes from writing, calls and speaking tagged with this topic */
  external: number
  categories: CategoryReport[]
}

export interface Analysis {
  topics: TopicReport[]
  categories: CategoryReport[]
  focus: TopicReport[]
  missedWords: { id: string; es: string; en: string; nl: string; misses: number }[]
}

function groupCategories(items: { category: Category; ex: Example }[]): CategoryReport[] {
  const by = new Map<Category, CategoryReport>()
  for (const { category, ex } of items) {
    const r = by.get(category) ?? { category, count: 0, examples: [] }
    r.count++
    if (r.examples.length < 3) r.examples.push(ex)
    by.set(category, r)
  }
  return [...by.values()].sort((a, b) => b.count - a.count)
}

/** `attempts` should be the history to analyse (e.g. the last 60–90 days). */
export function analyse(attempts: Attempt[], mistakes: Mistake[] = []): Analysis {
  const sorted = [...attempts].sort((a, b) => b.ts - a.ts) // newest first
  const classified: { a: Attempt; category: Category; ex: Example }[] = []
  for (const a of sorted) {
    const c = classify(a)
    if (c) classified.push({ a, category: c.category, ex: { you: a.answer, correct: c.correct, topic: a.topic, date: a.date } })
  }

  const topics: TopicReport[] = TOPICS.map((t) => {
    const list = sorted.filter((a) => a.topic === t.id && a.source !== 'vocab')
    const recent = list.slice(0, 30)
    const n = recent.length
    const acc = n ? recent.reduce((s, a) => s + scoreOf(a), 0) / n : 0
    let trend: Trend = null
    const last = list.slice(0, 15)
    const prev = list.slice(15, 30)
    if (last.length >= 8 && prev.length >= 8) {
      const d = last.reduce((s, a) => s + scoreOf(a), 0) / last.length - prev.reduce((s, a) => s + scoreOf(a), 0) / prev.length
      trend = d >= 0.1 ? 'up' : d <= -0.1 ? 'down' : 'flat'
    }
    return {
      topic: t.id,
      n,
      acc,
      level: levelOf(acc, n),
      trend,
      external: mistakes.filter((m) => m.topic === t.id && m.source !== 'drill' && !m.slip).length,
      categories: groupCategories(classified.filter((c) => c.a.topic === t.id)),
    }
  })

  const focus = topics
    .filter((t) => t.level !== 'none' && t.acc < 0.85)
    .sort((a, b) => a.acc - (a.trend === 'down' ? 0.05 : 0) - (b.acc - (b.trend === 'down' ? 0.05 : 0)))
    .slice(0, 3)

  const misses = new Map<string, number>()
  for (const a of sorted) if (a.source === 'vocab' && scoreOf(a) === 0) misses.set(a.itemId, (misses.get(a.itemId) ?? 0) + 1)
  const missedWords = [...misses.entries()]
    .filter(([id]) => VOCAB_BY_ID[id])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, n]) => ({ id, es: VOCAB_BY_ID[id].es, en: VOCAB_BY_ID[id].en, nl: VOCAB_BY_ID[id].nl, misses: n }))

  return { topics, categories: groupCategories(classified), focus, missedWords }
}
