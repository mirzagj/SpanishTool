/**
 * Interface translations. English strings are the keys; ES holds the Spanish (Mexican) version.
 * Rule explanations and grammar notes stay in English.
 * A unit test checks that every t('…') used in the code has a Spanish entry.
 */
import { useSettings } from './settings'
import { ES } from './i18n-es'

export type UiLang = 'en' | 'es'

export function translate(lang: UiLang, key: string, vars?: Record<string, string | number>): string {
  let s = lang === 'es' ? (ES[key] ?? key) : key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

export type T = (key: string, vars?: Record<string, string | number>) => string

export function useT(): T {
  const { uiLang } = useSettings()
  return (key, vars) => translate(uiLang, key, vars)
}

/** Plural helper: picks "{n} card" / "{n} cards" style keys. */
export const plural = (t: T, n: number, one: string, many: string) => t(n === 1 ? one : many, { n })
