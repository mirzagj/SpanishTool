import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TOPICS } from '../data/topics'
import { THEMES } from '../data/vocab/themes'
import { WEEKDAYS_LONG } from './dates'
import { translate } from './i18n'
import { ES } from './i18n-es'
import { DAY_TYPE_LABEL } from './settings'
import { CATEGORY_HINT, CATEGORY_LABEL, LEVEL_LABEL } from './analysis'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.test.ts') && !f.startsWith('i18n') ? [p] : []
  })
}

describe('Spanish interface', () => {
  it('has a translation for every t("…") string in the code', () => {
    const keys = new Set<string>()
    for (const f of files('src')) {
      const s = readFileSync(f, 'utf8')
      for (const m of s.matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(m[2].replace(/\\'/g, "'"))
      for (const m of s.matchAll(/t\([^()]*?===\s*1\s*\?\s*'([^']*)'\s*:\s*'([^']*)'/g)) {
        keys.add(m[1])
        keys.add(m[2])
      }
    }
    const missing = [...keys].filter((k) => !(k in ES))
    expect(missing).toEqual([])
    expect(keys.size).toBeGreaterThan(200)
  })

  it('translates dynamic labels (topics, themes, weekdays, exercise types)', () => {
    const dynamic = [
      ...TOPICS.flatMap((t) => [t.name, t.short]),
      ...THEMES.map((t) => t.name),
      ...Object.values(DAY_TYPE_LABEL),
      ...WEEKDAYS_LONG,
      ...Object.values(CATEGORY_LABEL),
      ...Object.values(CATEGORY_HINT),
      ...Object.values(LEVEL_LABEL),
      'improving', 'getting worse', 'steady',
      'Fill the gap', 'Translate', 'Rewrite', 'Unscramble', 'Choose & explain', 'Vocabulary',
      'From a series', 'From your call', 'From your writing', 'Your mistake',
      'Type the missing word(s).', 'Build this sentence in Spanish:', 'Translate into (Mexican) Spanish.', 'Tap the words in the right order.', 'Choose, and say why.',
      'Fix the sentence (type the correct version):', 'Type the Spanish word',
      'All core blocks', 'Light day', 'Partly done', 'Nothing',
      'Mistakes', 'Vocabulary', 'Grammar', 'Voice memos', 'All', 'Drills', 'Writing', 'Calls', 'Speaking', 'Added',
      'Topic', 'Mixed', 'Structure', 'Podcast', 'YouTube', 'Other', 'Article', 'Book',
      'Today', 'Calendar', 'Progress', 'Library', 'Settings', 'new', 'learning', 'mature', 'All themes', 'My words',
      'No JSON found. Paste the whole reply, including the ```json block.', 'The JSON could not be read. Check that the block is complete.', 'Expected {"errors": [...]}.',
      'This file is not valid JSON.', 'This is not a Paso Diario backup file.', 'Speech recognition was blocked.',
    ]
    expect(dynamic.filter((k) => !(k in ES))).toEqual([])
  })

  it('interpolates variables', () => {
    expect(translate('es', '{n} cards due', { n: 3 })).toBe('3 tarjetas pendientes')
    expect(translate('en', '{n} cards due', { n: 3 })).toBe('3 cards due')
    expect(translate('es', 'not a key')).toBe('not a key')
  })
})
