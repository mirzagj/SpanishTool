/**
 * Tiny helpers to write exercises compactly.
 *
 * Answers are a single string separated by "|": the first one is the canonical answer,
 * the rest are accepted alternatives. Use "___" for the gap in gap/pair sentences.
 *
 *   gap(sentence, answers, explanation, spainNote?)
 *   tr(dutch, english, answers, explanation, spainNote?)         translate to Spanish
 *   rw(instruction, sourceSentence, answers, explanation, spain?) rewrite
 *   us(answers, explanation, spain?)                              unscramble (words come from the first answer)
 *   pr(sentence, "optA|optB", answer, explanation, spain?)        choose & explain (minimal pair)
 *
 * Exercise ids are a hash of the content, so you can reorder or append freely.
 * Editing an exercise's prompt gives it a new id (its old history simply stops counting).
 */
import type { Exercise, ExerciseDraft, TopicId } from '../types'

const A = (s: string) =>
  s
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)

export const gap = (prompt: string, answers: string, explain: string, spain?: string): ExerciseDraft => ({
  type: 'gap',
  prompt,
  answers: A(answers),
  explain,
  spain,
})

export const tr = (nl: string, en: string, answers: string, explain: string, spain?: string): ExerciseDraft => ({
  type: 'translate',
  prompt: '',
  nl,
  en,
  answers: A(answers),
  explain,
  spain,
})

export const rw = (instr: string, prompt: string, answers: string, explain: string, spain?: string): ExerciseDraft => ({
  type: 'rewrite',
  instr,
  prompt,
  answers: A(answers),
  explain,
  spain,
})

export const us = (answers: string, explain: string, spain?: string): ExerciseDraft => ({
  type: 'unscramble',
  prompt: '',
  answers: A(answers),
  explain,
  spain,
})

export const pr = (prompt: string, options: string, answer: string, explain: string, spain?: string): ExerciseDraft => ({
  type: 'pair',
  prompt,
  options: A(options),
  answers: [answer],
  explain,
  spain,
})

export function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function topicSet(topic: TopicId, drafts: ExerciseDraft[]): Exercise[] {
  return drafts.map((d) => ({
    ...d,
    topic,
    id: `${topic}:${hash(`${d.type}|${d.instr ?? ''}|${d.prompt}|${d.nl ?? ''}|${d.answers[0]}`)}`,
  }))
}
