/**
 * Vocabulary lines are written as:
 *
 *   "spanish | dutch | english | Example sentence with the [target] in brackets."
 *
 * optionally followed by:
 *   "| =alt1; alt2"      other accepted answers (e.g. the form used in the sentence, feminine form)
 *   "| ES: …"            Spain-only equivalent, shown as "recognise only"
 *
 * The bracketed text must equal the Spanish word or one of the alternatives
 * (a unit test checks this), so the example works as a fill-the-gap card.
 */
import { hash } from '../exercises/dsl'
import type { VocabItem, VocabTheme } from '../types'

export function parseVocab(theme: VocabTheme, lines: string[]): VocabItem[] {
  return lines.map((line) => {
    const [es, nl, en, ex, ...rest] = line.split(' | ').map((s) => s.trim())
    let alts: string[] = []
    let spain: string | undefined
    for (const r of rest) {
      if (r.startsWith('ES:')) spain = r.slice(3).trim()
      else if (r.startsWith('=')) alts = r.slice(1).split(';').map((s) => s.trim()).filter(Boolean)
    }
    return { id: `${theme}:${hash(es)}`, theme, es, alts, nl, en, ex, spain }
  })
}
