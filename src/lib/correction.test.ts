import { describe, expect, it } from 'vitest'
import { buildCorrectionPrompt, cleanCorrections, countSentences, parseCorrections } from './correction'
import { SPEAKING_PROMPTS, WRITING_IDEAS, WRITING_STATEMENTS, speakingPromptFor } from '../data/prompts'
import { TOPICS } from '../data/topics'

describe('correction prompt', () => {
  it('asks for overall feedback and only real mistakes', () => {
    const p = buildCorrectionPrompt({ text: 'Ayer iba al cine.', words: [{ es: 'platicar', gloss: 'to chat', sentence: 'Me gusta platicar.' }, { es: 'x', gloss: 'y', sentence: ' ' }], lang: 'en' })
    expect(p).toContain('Ayer iba al cine.')
    expect(p).toContain('platicar (to chat): "Me gusta platicar."')
    expect(p).not.toContain('x (y)')
    expect(p).toContain('Overall feedback')
    expect(p).toContain('NOT mistakes')
    expect(p).toContain('accents, capital letters, punctuation')
    expect(p).toContain('regional variants')
    expect(p).toContain('"summary"')
    expect(p).toContain('pret-imp')
  })
  it('mentions the statement when you react to one', () => {
    const p = buildCorrectionPrompt({ text: 'No estoy de acuerdo.', lang: 'en', topic: { kind: 'statement', text: 'El VAR ha mejorado el futbol.' } })
    expect(p).toContain('I gave my opinion on this statement: "El VAR ha mejorado el futbol."')
    expect(p).toContain('reaction to my opinion')
  })
  it('works with only word sentences', () => {
    const p = buildCorrectionPrompt({ text: '', words: [{ es: 'platicar', gloss: 'to chat', sentence: 'Me gusta platicar.' }], lang: 'nl' })
    expect(p).not.toContain('My text:')
    expect(p).toContain('in Dutch')
  })
})

describe('cleanCorrections', () => {
  it('drops accent / capital / punctuation-only items and merges the same sentence', () => {
    const { kept, dropped } = cleanCorrections([
      { original: 'cuando algo es dificil, necesito ayuda.', correction: 'Cuando algo es difícil, necesito ayuda.', explanation: 'capital', topic: undefined },
      { original: 'Despues de te lo explicé, te lo mando otro ejemplo.', correction: 'Después de explicárselo, le mando otro ejemplo.', explanation: 'después de + infinitive', topic: 'connectors' },
      { original: 'Despues de te lo explicé, te lo mando otro ejemplo.', correction: 'Después de explicárselo, le mando otro ejemplo.', explanation: 'se lo', topic: 'double-pronouns' },
    ])
    expect(dropped).toBe(1)
    expect(kept).toHaveLength(1)
    expect(kept[0].explanation).toBe('después de + infinitive; se lo')
    expect(kept[0].topic).toBe('connectors')
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
  it('reads the overall feedback and focus', () => {
    const r = parseCorrections('```json\n{"summary": "Very natural!", "focus": ["le vs lo"], "errors": []}\n```')
    expect(r).toEqual({ errors: [], summary: 'Very natural!', focus: ['le vs lo'] })
  })
  it('handles an empty error list', () => {
    expect(parseCorrections('```json\n{"errors": []}\n```')).toEqual({ errors: [] })
  })
})

describe('prompts', () => {
  it('every topic has writing and speaking prompts', () => {
    for (const t of TOPICS) {
      expect(SPEAKING_PROMPTS.filter((p) => p.topic === t.id).length, t.id).toBeGreaterThanOrEqual(2)
      expect(speakingPromptFor(t.id, '2026-11-25').targets.length).toBeGreaterThanOrEqual(2)
    }
  })
  it('has writing ideas', () => {
    expect(WRITING_IDEAS.length).toBeGreaterThanOrEqual(20)
    expect(WRITING_STATEMENTS.length).toBeGreaterThanOrEqual(20)
  })
  it('counts sentences', () => {
    expect(countSentences('Ayer fui al cine. Me gustó mucho! ¿Y tú? Ok')).toBe(3)
  })
})
