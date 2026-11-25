import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { EXERCISES } from '../data/exercises'
import { db } from './db'
import { cardItem } from './items'
import { ensureDay, rebuildDay, setBlockDone, setLight } from './plan'
import { addAlternative, addCustomWord, addMistakeWithCard, recordDrill } from './practice'
import { saveSettings } from './settings'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('drill results', () => {
  it('a wrong answer logs a mistake and creates a review card due tomorrow', async () => {
    const e = EXERCISES.find((x) => x.topic === 'pret-imp' && x.type === 'gap')!
    await recordDrill(e, { correct: false, answer: 'fue', prompt: e.prompt, today: '2026-11-25' })
    const [m] = await db.mistakes.toArray()
    expect(m).toMatchObject({ source: 'drill', topic: 'pret-imp', wrong: 'fue', correct: e.answers[0] })
    const card = await db.cards.get(`ex:${e.id}`)
    expect(card).toMatchObject({ kind: 'exercise', refId: e.id, due: '2026-11-26' })
    expect(cardItem(card!, 'nl')?.answers).toEqual(e.answers)
    // the same exercise wrong again resets the existing card instead of duplicating it
    await recordDrill(e, { correct: false, answer: 'fue', prompt: e.prompt, today: '2026-11-27' })
    expect(await db.cards.count()).toBe(1)
    expect((await db.cards.get(`ex:${e.id}`))!.lapses).toBe(1)
  })
  it('a right answer only records an attempt', async () => {
    const e = EXERCISES[0]
    await recordDrill(e, { correct: true, answer: e.answers[0], prompt: e.prompt, today: '2026-11-25' })
    expect(await db.attempts.count()).toBe(1)
    expect(await db.mistakes.count()).toBe(0)
    expect(await db.cards.count()).toBe(0)
  })
})

describe('custom cards', () => {
  it('writing / call mistakes become "fix the sentence" cards', async () => {
    const id = await addMistakeWithCard({ source: 'writing', wrong: 'Ayer iba al cine.', correct: 'Ayer fui al cine.', explain: 'Completed event → preterite', topic: 'pret-imp' }, '2026-11-25')
    const card = (await db.cards.get(id))!
    const item = cardItem(card, 'en')!
    expect(item.prompt).toBe('Ayer iba al cine.')
    expect(item.answers).toEqual(['Ayer fui al cine.'])
    expect((await db.mistakes.toArray())[0].cardId).toBe(id)
  })
  it('series words blank the word in the sentence', async () => {
    const id = await addCustomWord({ word: 'chamba', sentence: 'Tengo mucha chamba hoy.', translation: 'werk', source: 'series' }, '2026-11-25')
    const card = (await db.cards.get(id))!
    expect(card.context).toBe('Tengo mucha ___ hoy.')
    expect(card.front).toBe('werk')
    expect(card.due).toBe('2026-11-25')
  })
  it('"I was actually right" stores extra answers once', async () => {
    await addAlternative('ex:abc', 'Fuimos a la playa')
    await addAlternative('ex:abc', 'Fuimos a la playa')
    expect((await db.alts.get('ex:abc'))!.answers).toEqual(['Fuimos a la playa'])
  })
})

describe('day records', () => {
  it('creates the day once, toggles blocks and light mode, and rebuilds from the template', async () => {
    const d = await ensureDay('2026-11-23')
    expect(d.dayType).toBe('topic')
    expect((await ensureDay('2026-11-23')).created).toBe(d.created)
    await setBlockDone('2026-11-23', 'review', true)
    await setLight('2026-11-23', true)
    await saveSettings({ blockMinutes: { review: 10, drills: 10, vocab: 10, writing: 10, speaking: 5 } })
    await rebuildDay('2026-11-23')
    const r = (await db.days.get('2026-11-23'))!
    expect(r.light).toBe(true)
    expect(r.blocks.find((b) => b.kind === 'review')).toMatchObject({ done: true, minutes: 10 })
  })
  it('topic days advance the curriculum only when drills were done', async () => {
    const mon = await ensureDay('2026-11-23')
    await setBlockDone('2026-11-23', 'drills', true)
    const tue = await ensureDay('2026-11-24')
    expect(mon.topic).toBe('present-irregular')
    expect(tue.pos).toEqual({ day: 2, of: 2 })
    // Tuesday skipped → Friday continues where we left off
    const fri = await ensureDay('2026-11-27')
    expect(fri.topic).toBe('present-irregular')
    expect(fri.pos).toEqual({ day: 2, of: 2 })
  })
})

describe('backup', () => {
  it('exports and restores everything (audio optional)', async () => {
    const { exportData, importData } = await import('./backup')
    await ensureDay('2026-11-23')
    await addMistakeWithCard({ source: 'call', wrong: 'a', correct: 'b' }, '2026-11-23')
    await db.recordings.add({ date: '2026-11-23', ts: 1, kind: 'speaking', prompt: 'p', blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }), mime: 'audio/webm', duration: 2, redo: false })
    const withAudio = JSON.stringify(await exportData(true))
    const withoutAudio = JSON.stringify(await exportData(false))
    await db.delete()
    await db.open()
    const counts = await importData(withAudio)
    expect(counts).toMatchObject({ days: 1, cards: 1, mistakes: 1, recordings: 1 })
    const rec = (await db.recordings.toArray())[0]
    expect(new Uint8Array(await rec.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    // a backup without audio keeps the recordings that are already on the device
    await importData(withoutAudio)
    expect(await db.recordings.count()).toBe(1)
    await expect(importData('{"nope":1}')).rejects.toThrow('not a Paso Diario backup')
  })
})
