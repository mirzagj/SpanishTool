import type { Exercise, TopicId } from '../data/types'
import { addDays } from './dates'
import { db, uid, type Card, type CardSource, type MistakeSource } from './db'
import { NEW_SRS, schedule } from './srs'

/** Add an answer the user insists is right ("I was actually right"). */
export async function addAlternative(key: string, answer: string) {
  const a = answer.trim()
  if (!a) return
  await db.transaction('rw', db.alts, async () => {
    const row = await db.alts.get(key)
    const answers = row?.answers ?? []
    if (!answers.includes(a)) answers.push(a)
    await db.alts.put({ key, answers })
  })
}

/** Create a card or reset an existing one after a mistake (due tomorrow). */
async function upsertMistakeCard(id: string, fields: Omit<Card, 'id' | 'ef' | 'interval' | 'reps' | 'lapses' | 'due' | 'created'>, today: string) {
  const existing = await db.cards.get(id)
  if (existing) {
    await db.cards.put({ ...existing, ...schedule(existing, 1, today) })
  } else {
    await db.cards.put({ id, ...fields, ...NEW_SRS(addDays(today, 1)), interval: 1, created: Date.now() })
  }
}

export const SCORE = { correct: 1, almost: 0.5, wrong: 0 } as const

export async function recordDrill(
  e: Exercise,
  opts: { verdict: 'correct' | 'almost' | 'wrong'; flags?: string[]; answer: string; prompt: string; today: string },
) {
  const { verdict, answer, prompt, today } = opts
  const correct = verdict === 'correct'
  await db.transaction('rw', db.attempts, db.mistakes, db.cards, async () => {
    await db.attempts.add({ date: today, ts: Date.now(), itemId: e.id, topic: e.topic, source: 'drill', correct, answer, score: SCORE[verdict], flags: opts.flags })
    if (verdict === 'almost') {
      // logged so the analysis can see your spelling slips, but no review card
      await db.mistakes.add({ date: today, ts: Date.now(), source: 'drill', topic: e.topic, prompt, wrong: answer, correct: e.answers[0], explain: e.explain, slip: true })
    }
    if (verdict === 'wrong') {
      const cardId = `ex:${e.id}`
      await db.mistakes.add({
        date: today,
        ts: Date.now(),
        source: 'drill',
        topic: e.topic,
        prompt,
        wrong: answer,
        correct: e.answers[0],
        explain: e.explain,
        cardId,
      })
      await upsertMistakeCard(cardId, { kind: 'exercise', refId: e.id, source: 'drill', topic: e.topic }, today)
    }
  })
}

export interface NewMistake {
  source: MistakeSource
  wrong: string
  correct: string
  explain?: string
  topic?: TopicId
  prompt?: string
}

/** Log a mistake (writing / call / speaking) and turn it into a "fix the sentence" review card. */
export async function addMistakeWithCard(m: NewMistake, today: string) {
  const cardId = `cu:${uid()}`
  const src: CardSource = m.source === 'manual' ? 'manual' : m.source === 'drill' ? 'drill' : m.source
  await db.transaction('rw', db.mistakes, db.cards, async () => {
    await db.mistakes.add({
      date: today,
      ts: Date.now(),
      source: m.source,
      topic: m.topic,
      prompt: m.prompt ?? '',
      wrong: m.wrong,
      correct: m.correct,
      explain: m.explain ?? '',
      cardId,
    })
    await db.cards.put({
      id: cardId,
      kind: 'custom',
      source: src,
      topic: m.topic,
      front: 'Fix the sentence (type the correct version):',
      context: m.wrong,
      answers: [m.correct],
      explain: m.explain,
      ...NEW_SRS(addDays(today, 1)),
      interval: 1,
      created: Date.now(),
    })
  })
  return cardId
}

/** A word from a series (or anywhere): front = translation + sentence with the word blanked. */
export async function addCustomWord(w: { word: string; sentence: string; translation: string; source: CardSource; note?: string }, today: string) {
  const word = w.word.trim()
  const sentence = w.sentence.trim()
  const idx = sentence.toLowerCase().indexOf(word.toLowerCase())
  const context = idx >= 0 && word ? sentence.slice(0, idx) + '___' + sentence.slice(idx + word.length) : sentence
  const id = `cu:${uid()}`
  await db.cards.put({
    id,
    kind: 'custom',
    source: w.source,
    theme: 'custom',
    front: w.translation.trim() || 'Type the Spanish word',
    context,
    answers: [word],
    explain: idx >= 0 ? undefined : sentence ? `Sentence: ${sentence}` : undefined,
    ...NEW_SRS(today),
    created: Date.now(),
  })
  return id
}
