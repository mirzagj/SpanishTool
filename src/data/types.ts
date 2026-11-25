export type TopicId =
  | 'present-irregular'
  | 'ser-estar'
  | 'preterite'
  | 'pret-imp'
  | 'perf-pret'
  | 'pluperfect'
  | 'fut-cond'
  | 'obj-pronouns'
  | 'double-pronouns'
  | 'subj-present'
  | 'subj-imperfect'
  | 'si-clauses'
  | 'por-para'
  | 'connectors'
  | 'relatives'
  | 'se-passive'
  | 'reported'
  | 'word-order'

export type ExerciseType = 'gap' | 'translate' | 'rewrite' | 'unscramble' | 'pair'

/** A grammar exercise as written in the data files (id is added automatically). */
export interface ExerciseDraft {
  type: ExerciseType
  /** gap / pair: sentence containing ___ ; rewrite: the source sentence; translate / unscramble: '' */
  prompt: string
  /** rewrite: the instruction (in Spanish) */
  instr?: string
  /** translate: Dutch and English source sentences */
  nl?: string
  en?: string
  /** pair: the two options of the minimal pair */
  options?: string[]
  /** First item is the canonical answer, the rest are accepted alternatives. */
  answers: string[]
  /** One-line rule shown after answering. */
  explain: string
  /** Spain-only form, shown as "recognise only". */
  spain?: string
}

export interface Exercise extends ExerciseDraft {
  id: string
  topic: TopicId
}

export type VocabTheme =
  | 'daily'
  | 'opinions'
  | 'football'
  | 'travel'
  | 'news'
  | 'study-it'
  | 'connectors'

export interface VocabItem {
  id: string
  theme: VocabTheme
  /** Dictionary form (what you type). */
  es: string
  /** Other accepted answers. */
  alts: string[]
  nl: string
  en: string
  /** Example sentence; the target is wrapped in [brackets]. */
  ex: string
  /** Spain equivalent, recognise only. */
  spain?: string
}

export interface GrammarNote {
  topic: TopicId
  summary: string
  rules: string[]
  pitfalls: string[]
  examples: { es: string; en: string }[]
  spain?: string[]
}

export interface WritingPrompt {
  topic: TopicId
  text: string
  target: string
}

export interface SpeakingPrompt {
  topic: TopicId
  text: string
  targets: string[]
}
