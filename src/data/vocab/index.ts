import type { VocabItem, VocabTheme } from '../types'
import { daily, opinions } from './daily-opinions'
import { football, travel } from './football-travel'
import { connectors, news, studyIt } from './news-study-connectors'

export const VOCAB: VocabItem[] = [...daily, ...opinions, ...football, ...travel, ...news, ...studyIt, ...connectors]
export const VOCAB_BY_ID: Record<string, VocabItem> = Object.fromEntries(VOCAB.map((v) => [v.id, v]))
export const VOCAB_BY_THEME = VOCAB.reduce(
  (acc, v) => {
    ;(acc[v.theme] ||= []).push(v)
    return acc
  },
  {} as Record<VocabTheme, VocabItem[]>,
)
