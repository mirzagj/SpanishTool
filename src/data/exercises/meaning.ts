import type { Exercise } from '../types'
import { MEANINGS_A } from './meanings-a'
import { MEANINGS_B } from './meanings-b'
import { MEANINGS_C } from './meanings-c'
import { MEANINGS_D } from './meanings-d'

/** The complete Spanish sentence of an exercise (gap filled in, hints in brackets removed). */
export function fullSentence(e: Exercise): string {
  const s = e.type === 'gap' || e.type === 'pair' ? e.prompt.replace(/___(\s*\([^)]*\))?/, e.answers[0]) : e.answers[0]
  return s.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
}


/** English meaning per full Spanish sentence. To add one: put [spanish, english] in a meanings-*.ts file. */
export const MEANINGS: Record<string, string> = Object.fromEntries([...MEANINGS_A, ...MEANINGS_B, ...MEANINGS_C, ...MEANINGS_D])

/** English meaning of an exercise (translate exercises already show theirs as the prompt). */
export function meaningOf(e: Exercise): string | undefined {
  return e.type === 'translate' ? e.en : MEANINGS[fullSentence(e)]
}
