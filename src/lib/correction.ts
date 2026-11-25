/**
 * The no-API writing loop: build a ready-made correction prompt for any AI chat,
 * then read the JSON list of errors back from the pasted reply.
 */
import { TOPICS } from '../data/topics'
import type { TopicId } from '../data/types'

export interface ImportedError {
  original: string
  correction: string
  explanation: string
  topic?: TopicId
}

export function buildCorrectionPrompt(opts: { task: string; target: string; text: string; lang: 'nl' | 'en' }): string {
  const topicList = TOPICS.map((t) => `${t.id} (${t.name})`).join(', ')
  const explainLang = opts.lang === 'nl' ? 'Dutch' : 'English'
  return `You are my Spanish teacher. I speak Dutch natively and I'm learning Spanish (reading ≈ B2, writing ≈ B1+). I want natural MEXICAN Spanish (ustedes, Mexican vocabulary, preterite rather than present perfect for finished actions).

Task I was given: ${opts.task}
Grammar I was practising: ${opts.target}

My text:
"""
${opts.text.trim()}
"""

Please reply with:
1. The corrected text — keep my meaning and style; change only what is wrong or clearly unnatural in Mexico.
2. A short numbered list explaining each error in ${explainLang} (one line each).
3. At the very end, a JSON code block in exactly this format:

\`\`\`json
{"errors": [
  {"original": "the full sentence as I wrote it", "correction": "the full corrected sentence", "explanation": "one-line rule in ${explainLang}", "topic": "pret-imp"}
]}
\`\`\`

Rules for the JSON:
- One entry per error. Use the WHOLE sentence (or clause) for "original" and "correction" so I can practise it as a flashcard.
- "topic" must be one of: ${topicList}, or "other".
- If my text has no errors, return {"errors": []}.`
}

function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence && /[[{]/.test(fence[1])) return fence[1].trim()
  const startObj = text.indexOf('{')
  const startArr = text.indexOf('[')
  const start = startObj < 0 ? startArr : startArr < 0 ? startObj : Math.min(startObj, startArr)
  if (start < 0) return null
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  return end > start ? text.slice(start, end + 1) : null
}

const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (typeof o[k] === 'string' && (o[k] as string).trim()) return (o[k] as string).trim()
  return ''
}

/** Parse the AI reply (whole reply or just the JSON). Tolerates code fences, smart quotes and trailing commas. */
export function parseCorrections(raw: string): { errors: ImportedError[]; problem?: string } {
  const json = extractJson(raw)
  if (!json) return { errors: [], problem: 'No JSON found. Paste the whole reply, including the ```json block.' }
  let data: unknown
  const attempts = [json, json.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')]
  for (const a of attempts) {
    try {
      data = JSON.parse(a)
      break
    } catch {
      /* try next */
    }
  }
  if (data === undefined) return { errors: [], problem: 'The JSON could not be read. Check that the block is complete.' }
  const list = Array.isArray(data) ? data : (data as { errors?: unknown }).errors
  if (!Array.isArray(list)) return { errors: [], problem: 'Expected {"errors": [...]}.' }
  const valid = new Set(TOPICS.map((t) => t.id as string))
  const errors = list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((o) => {
      const topic = pick(o, ['topic', 'category'])
      return {
        original: pick(o, ['original', 'wrong', 'error', 'incorrect', 'sentence']),
        correction: pick(o, ['correction', 'corrected', 'correct', 'fix']),
        explanation: pick(o, ['explanation', 'rule', 'reason', 'note']),
        topic: valid.has(topic) ? (topic as TopicId) : undefined,
      }
    })
    .filter((e) => e.correction && e.correction !== e.original)
  return { errors }
}

export function countSentences(text: string): number {
  return text
    .split(/[.!?…]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2).length
}
