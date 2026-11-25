import Dexie, { type EntityTable } from 'dexie'
import type { TopicId, VocabTheme } from '../data/types'
import type { SrsState } from './srs'

export type BlockKind = 'review' | 'drills' | 'vocab' | 'writing' | 'speaking'
export const BLOCKS: BlockKind[] = ['review', 'drills', 'vocab', 'writing', 'speaking']
/** The 20-minute minimum for a light day. */
export const LIGHT_BLOCKS: BlockKind[] = ['review', 'drills']

export type DayType = 'topic' | 'mixed' | 'structure'

export interface DayBlock {
  kind: BlockKind
  minutes: number
  done: boolean
  /** Time actually spent with the block open (timer). */
  seconds: number
}

export interface DayRecord {
  date: string
  dayType: DayType
  topic: TopicId
  /** Curriculum position on topic days, e.g. day 3 of 8. */
  pos?: { day: number; of: number }
  /** Speaking block becomes "Call with Mexican friend". */
  call: boolean
  light: boolean
  theme: VocabTheme
  blocks: DayBlock[]
  created: number
}

export type AttemptSource = 'drill' | 'review' | 'vocab'
export interface Attempt {
  id?: number
  date: string
  ts: number
  itemId: string
  topic?: TopicId
  source: AttemptSource
  correct: boolean
  answer: string
  /** 1 = right, 0.5 = almost (small slip), 0 = wrong. Older attempts only have `correct`. */
  score?: number
  /** What the checker was lenient about: accent, spelling, synonym, regional, article. */
  flags?: string[]
}

/** Credit for an attempt (0–1). */
export const scoreOf = (a: { score?: number; correct: boolean }) => a.score ?? (a.correct ? 1 : 0)

export type CardKind = 'exercise' | 'vocab' | 'custom'
export type CardSource = 'drill' | 'vocab' | 'writing' | 'call' | 'series' | 'speaking' | 'manual'
export interface Card extends SrsState {
  /** 'ex:<exerciseId>' | 'vo:<vocabId>' | 'cu:<random>' */
  id: string
  kind: CardKind
  refId?: string
  source: CardSource
  topic?: TopicId
  theme?: string
  /** Custom cards: instruction / prompt line, a sentence for context, accepted answers. */
  front?: string
  context?: string
  answers?: string[]
  explain?: string
  created: number
}

export type MistakeSource = 'drill' | 'writing' | 'call' | 'speaking' | 'manual'
export interface Mistake {
  id?: number
  date: string
  ts: number
  source: MistakeSource
  topic?: TopicId
  prompt: string
  wrong: string
  correct: string
  explain: string
  cardId?: string
  /** A small slip (almost right): logged for the analysis, no review card. */
  slip?: boolean
}

export interface Alt {
  key: string
  answers: string[]
}

export interface Writing {
  id?: number
  date: string
  ts: number
  topic: TopicId
  prompt: string
  text: string
  imported: number
}

export interface Recording {
  id?: number
  date: string
  ts: number
  kind: 'speaking' | 'redo'
  prompt: string
  blob: Blob
  mime: string
  duration: number
  transcript?: string
  /** Marked "redo worst sentence". */
  redo: boolean
  note?: string
  parentId?: number
}

export type LogType = 'series' | 'listening' | 'reading' | 'call'
export interface LogEntry {
  id?: number
  date: string
  ts: number
  type: LogType
  title: string
  /** listening: podcast / youtube / other; reading: article / book / other */
  sub?: string
  season?: number
  episode?: number
  minutes: number
  notes?: string
}

export interface KV {
  key: string
  value: unknown
}

export class PasoDB extends Dexie {
  kv!: EntityTable<KV, 'key'>
  days!: EntityTable<DayRecord, 'date'>
  attempts!: EntityTable<Attempt, 'id'>
  cards!: EntityTable<Card, 'id'>
  mistakes!: EntityTable<Mistake, 'id'>
  alts!: EntityTable<Alt, 'key'>
  writings!: EntityTable<Writing, 'id'>
  recordings!: EntityTable<Recording, 'id'>
  logs!: EntityTable<LogEntry, 'id'>

  constructor(name = 'paso-diario') {
    super(name)
    this.version(1).stores({
      kv: 'key',
      days: 'date',
      attempts: '++id, date, itemId, topic, source',
      cards: 'id, due, kind, source',
      mistakes: '++id, date, topic, source, cardId',
      alts: 'key',
      writings: '++id, date',
      recordings: '++id, date, parentId',
      logs: '++id, date, type',
    })
  }
}

export const db = new PasoDB()

export const TABLES = ['kv', 'days', 'attempts', 'cards', 'mistakes', 'alts', 'writings', 'recordings', 'logs'] as const
export type TableName = (typeof TABLES)[number]

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
