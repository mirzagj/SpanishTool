import { describe, expect, it } from 'vitest'
import { buildCorrectionPrompt, countSentences, parseCorrections } from './correction'
import { SPEAKING_PROMPTS, WRITING_PROMPTS, speakingPromptFor, writingPromptFor } from '../data/prompts'
import { TOPICS } from '../data/topics'

describe('correction prompt', () => {
  it('includes the text, the task and the JSON format', () => {
    const p = buildCorrectionPrompt({ task: 'Cuenta tu fin de semana', target: 'Preterite', text: 'Ayer iba al cine.', lang: 'en' })
    expect(p).toContain('Ayer iba al cine.')
    expect(p).toContain('Cuenta tu fin de semana')
    expect(p).toContain('"errors"')
    expect(p).toContain('pret-imp')
    expect(p).toContain('MEXICAN')
  })
})

describe('parseCorrections', () => {
  const reply = `Here is the corrected text:

Ayer fui al cine con mis amigos.

1. "iba" → "fui": a completed event.

\`\`\`json
{"errors": [
  {"original": "Ayer iba al cine con mis amigos.", "correction": "Ayer fui al cine con mis amigos.", "explanation": "Completed event → preterite", "topic": "pret-imp"},
  {"original": "Es muy bien.", "correction": "Está muy bien.", "explanation": "estar bien", "topic": "made-up"}
]}
\`\`\``

  it('reads the JSON block from a full AI reply', () => {
    const { errors, problem } = parseCorrections(reply)
    expect(problem).toBeUndefined()
    expect(errors).toHaveLength(2)
    expect(errors[0]).toEqual({ original: 'Ayer iba al cine con mis amigos.', correction: 'Ayer fui al cine con mis amigos.', explanation: 'Completed event → preterite', topic: 'pret-imp' })
    expect(errors[1].topic).toBeUndefined()
  })
  it('accepts a bare array, smart quotes and trailing commas', () => {
    const { errors } = parseCorrections('[{“original”: “a”, “correction”: “b”,},]')
    expect(errors).toEqual([{ original: 'a', correction: 'b', explanation: '', topic: undefined }])
  })
  it('accepts alternative key names', () => {
    const { errors } = parseCorrections('{"errors":[{"wrong":"Se me olvidé","correct":"Se me olvidó","rule":"accidental se"}]}')
    expect(errors[0]).toMatchObject({ original: 'Se me olvidé', correction: 'Se me olvidó', explanation: 'accidental se' })
  })
  it('reports when there is no JSON', () => {
    expect(parseCorrections('Looks great!').problem).toBeTruthy()
    expect(parseCorrections('{"errors": [').problem).toBeTruthy()
  })
  it('handles an empty error list', () => {
    expect(parseCorrections('```json\n{"errors": []}\n```')).toEqual({ errors: [] })
  })
})

describe('prompts', () => {
  it('every topic has writing and speaking prompts', () => {
    for (const t of TOPICS) {
      expect(WRITING_PROMPTS.filter((p) => p.topic === t.id).length, t.id).toBeGreaterThanOrEqual(3)
      expect(SPEAKING_PROMPTS.filter((p) => p.topic === t.id).length, t.id).toBeGreaterThanOrEqual(2)
      expect(writingPromptFor(t.id, '2026-11-25').topic).toBe(t.id)
      expect(speakingPromptFor(t.id, '2026-11-25').targets.length).toBeGreaterThanOrEqual(2)
    }
  })
  it('counts sentences', () => {
    expect(countSentences('Ayer fui al cine. Me gustó mucho! ¿Y tú? Ok')).toBe(3)
  })
})
