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

/**
 * Glosses split into meanings: "well / so" → ["well", "so"]. Qualifiers in brackets are kept
 * ("to save (money)" ≠ "to save (a shot)"), so only real synonyms match.
 */
const meanings = (g: string) =>
  g
    .toLowerCase()
    .replace(/’/g, "'")
    .split(/\s*[/;,]\s*/)
    .map((m) => m.trim())
    .filter((m) => m.length > 1)

const BY_MEANING = new Map<string, VocabItem[]>()
for (const v of VOCAB) {
  for (const m of new Set([...meanings(v.en).map((x) => `en:${x}`), ...meanings(v.nl).map((x) => `nl:${x}`)])) {
    BY_MEANING.set(m, [...(BY_MEANING.get(m) ?? []), v])
  }
}

/** Other words from the deck with the same meaning (e.g. bueno ↔ pues for "well"). */
export function synonymsFor(v: VocabItem): string[] {
  const out = new Set<string>()
  for (const m of [...meanings(v.en).map((x) => `en:${x}`), ...meanings(v.nl).map((x) => `nl:${x}`)]) {
    for (const o of BY_MEANING.get(m) ?? []) if (o.id !== v.id) [o.es, ...o.alts].forEach((w) => out.add(w))
  }
  for (const w of [v.es, ...v.alts]) out.delete(w)
  return [...out]
}
