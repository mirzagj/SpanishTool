import { createContext, useContext } from 'react'
import { DEFAULT_CURRICULUM, type CurriculumStep } from '../data/topics'
import { db, type BlockKind, type DayType } from './db'

export interface WeekdayPlan {
  type: DayType
  /** Speaking block becomes "Call with Mexican friend". */
  call: boolean
}

export interface Settings {
  /** Interface language. */
  uiLang: 'en' | 'es'
  /** Language of translation prompts and vocabulary glosses. */
  promptLang: 'nl' | 'en'
  accentStrict: boolean
  theme: 'system' | 'light' | 'dark'
  blockMinutes: Record<BlockKind, number>
  /** Index 0 = Monday. */
  week: WeekdayPlan[]
  curriculum: CurriculumStep[]
  /** Added to the number of completed topic days (lets you skip ahead or go back). */
  curriculumOffset: number
  newWordsPerDay: number
  transcript: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  uiLang: 'en',
  promptLang: 'en',
  accentStrict: false,
  theme: 'system',
  blockMinutes: { review: 8, drills: 12, vocab: 8, writing: 7, speaking: 10 },
  week: [
    { type: 'topic', call: false },
    { type: 'topic', call: false },
    { type: 'mixed', call: false },
    { type: 'structure', call: false },
    { type: 'topic', call: false },
    { type: 'topic', call: true },
    { type: 'mixed', call: false },
  ],
  curriculum: DEFAULT_CURRICULUM,
  curriculumOffset: 0,
  newWordsPerDay: 8,
  transcript: true,
}

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  topic: 'Topic day',
  mixed: 'Mixed review',
  structure: 'Structure focus',
}

export function withDefaults(v: Partial<Settings> | undefined): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(v ?? {}) }
  s.blockMinutes = { ...DEFAULT_SETTINGS.blockMinutes, ...(v?.blockMinutes ?? {}) }
  if (!Array.isArray(s.week) || s.week.length !== 7) s.week = DEFAULT_SETTINGS.week
  if (!Array.isArray(s.curriculum) || !s.curriculum.length) s.curriculum = DEFAULT_CURRICULUM
  return s
}

export async function loadSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return withDefaults(row?.value as Partial<Settings> | undefined)
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await loadSettings()
  const next = { ...cur, ...patch }
  await db.kv.put({ key: 'settings', value: next })
  if (patch.theme) {
    try {
      localStorage.setItem('paso-theme', patch.theme)
    } catch {
      /* storage unavailable */
    }
  }
}

export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS)
export const useSettings = () => useContext(SettingsContext)

export const totalMinutes = (s: Settings) => Object.values(s.blockMinutes).reduce((a, b) => a + b, 0)
