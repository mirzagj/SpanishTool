import type { TopicId } from './types'

export interface TopicMeta {
  id: TopicId
  name: string
  short: string
  /** Sentence-structure topics are used on "structure focus" days. */
  structure: boolean
}

export const TOPICS: TopicMeta[] = [
  { id: 'present-irregular', name: 'Present: irregular verbs', short: 'Present irregulars', structure: false },
  { id: 'ser-estar', name: 'Ser vs estar', short: 'Ser / estar', structure: false },
  { id: 'preterite', name: 'Preterite: regular & irregular', short: 'Preterite', structure: false },
  { id: 'pret-imp', name: 'Preterite vs imperfect', short: 'Pret. vs imperf.', structure: false },
  { id: 'perf-pret', name: 'Present perfect vs preterite', short: 'Perfect vs pret.', structure: false },
  { id: 'pluperfect', name: 'Pluperfect', short: 'Pluperfect', structure: false },
  { id: 'fut-cond', name: 'Future & conditional', short: 'Future / cond.', structure: false },
  { id: 'obj-pronouns', name: 'Object pronouns & placement', short: 'Object pronouns', structure: true },
  { id: 'double-pronouns', name: 'Double pronouns', short: 'Double pronouns', structure: true },
  { id: 'subj-present', name: 'Present subjunctive', short: 'Pres. subjunctive', structure: false },
  { id: 'subj-imperfect', name: 'Imperfect subjunctive', short: 'Imp. subjunctive', structure: false },
  { id: 'si-clauses', name: 'Si-clauses (types 1–3)', short: 'Si-clauses', structure: false },
  { id: 'por-para', name: 'Por vs para', short: 'Por / para', structure: false },
  { id: 'connectors', name: 'Connectors & discourse markers', short: 'Connectors', structure: true },
  { id: 'relatives', name: 'Relative clauses', short: 'Relative clauses', structure: true },
  { id: 'se-passive', name: 'Passive & "se" constructions', short: 'Passive / se', structure: true },
  { id: 'reported', name: 'Reported speech', short: 'Reported speech', structure: false },
  { id: 'word-order', name: 'Word order & negation', short: 'Word order', structure: true },
]

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, TopicMeta>
export const STRUCTURE_TOPICS: TopicId[] = TOPICS.filter((t) => t.structure).map((t) => t.id)
export const topicName = (id: TopicId | undefined) => (id ? TOPIC_BY_ID[id]?.name ?? id : '—')
export const topicShort = (id: TopicId | undefined) => (id ? TOPIC_BY_ID[id]?.short ?? id : '—')

export interface CurriculumStep {
  topic: TopicId
  /** Number of "topic days" spent on this topic before moving on. */
  days: number
}

/**
 * Default sequence. With the default week (4 topic days per week) this takes ~11–12 weeks,
 * with mixed-review and structure days woven in (spiral review).
 */
export const DEFAULT_CURRICULUM: CurriculumStep[] = [
  { topic: 'present-irregular', days: 2 },
  { topic: 'ser-estar', days: 2 },
  { topic: 'preterite', days: 2 },
  { topic: 'pret-imp', days: 8 },
  { topic: 'perf-pret', days: 2 },
  { topic: 'pluperfect', days: 2 },
  { topic: 'fut-cond', days: 2 },
  { topic: 'obj-pronouns', days: 2 },
  { topic: 'double-pronouns', days: 2 },
  { topic: 'subj-present', days: 4 },
  { topic: 'subj-imperfect', days: 2 },
  { topic: 'si-clauses', days: 3 },
  { topic: 'por-para', days: 2 },
  { topic: 'connectors', days: 2 },
  { topic: 'relatives', days: 2 },
  { topic: 'se-passive', days: 2 },
  { topic: 'reported', days: 2 },
  { topic: 'word-order', days: 2 },
]
