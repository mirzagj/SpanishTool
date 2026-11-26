/**
 * The no-API writing loop: build a ready-made correction prompt for any AI chat,
 * then read the JSON list of errors back from the pasted reply.
 */
import { TOPICS } from '../data/topics'
import type { TopicId } from '../data/types'
import { normalize } from './check'

export interface ImportedError {
  original: string
  correction: string
  explanation: string
  topic?: TopicId
}

export interface WordSentence {
  es: string
  gloss: string
  sentence: string
}

/**
 * Prompt for any AI chat. Free writing, overall feedback first, and only REAL mistakes count:
 * accents, capitals, punctuation, regional (Spain) variants and style are never errors.
 */
export function buildCorrectionPrompt(opts: { text: string; words?: WordSentence[]; lang: 'nl' | 'en'; topic?: { kind: 'idea' | 'statement' | 'translate'; text: string } }): string {
  const topicList = TOPICS.map((t) => `${t.id} (${t.name})`).join(', ')
  const lang = opts.lang === 'nl' ? 'Dutch' : 'English'
  const words = (opts.words ?? []).filter((w) => w.sentence.trim())
  const text = opts.text.trim()
  const parts: string[] = []
  parts.push(
    `You're my Spanish teacher and conversation partner. I'm a Dutch native speaker learning Mexican Spanish (reading ≈ B2, writing ≈ B1+). I wrote this freely, about whatever I wanted.`,
  )
  if (text && opts.topic?.kind === 'statement') parts.push(`I gave my opinion on this statement: "${opts.topic.text}"`)
  if (text && opts.topic?.kind === 'idea') parts.push(`I wrote about: "${opts.topic.text}"`)
  const translating = opts.topic?.kind === 'translate' && !!text
  if (translating) parts.push(`I translated this English text into Spanish:\n"""\n${opts.topic!.text}\n"""`)
  if (text) parts.push(`${translating ? 'My translation' : 'My text'}:\n"""\n${text}\n"""`)
  if (words.length) {
    parts.push(`I also practised some new words, one sentence each:\n${words.map((w, i) => `${i + 1}. ${w.es} (${w.gloss}): "${w.sentence.trim()}"`).join('\n')}`)
  }
  parts.push(`How to correct me:
- Only count REAL mistakes: grammar, a wrong word or meaning, or something a native speaker would find wrong or confusing.
- These are NOT mistakes, so never put them in the mistakes list or the JSON: accents, capital letters, punctuation, ñ, Spain Spanish or other regional variants (they're correct Spanish), and anything that's just a matter of style. You may mention a few of them under "Optional tips".
- Keep my style and my words. Don't rewrite things that are already fine.${
    translating
      ? `
- It's a translation, but judge MEANING, not word for word: if I say the same thing with different but correct words or a different sentence structure, that's fine and NOT a mistake. Only count real Spanish mistakes, and places where my meaning differs from the English or something important is missing.`
      : ''
  }`)
  const steps: string[] = []
  steps.push(
    opts.topic?.kind === 'statement' && text
      ? 'Overall feedback (3–4 sentences): what came across well, how natural it sounds, my rough level, and one short reaction to my opinion as a conversation partner would give.'
      : 'Overall feedback (3–4 sentences): what came across well, how natural it sounds, and my rough level.',
  )
  if (text) steps.push('My text with only the real mistakes fixed.')
  steps.push('The real mistakes, numbered, one line each: what I wrote → better, and why.')
  if (translating) steps.push('A natural Mexican translation of the English text, only for comparison (not as corrections).')
  if (words.length) steps.push('For each new word: did I use it correctly and naturally? If not, give a better sentence.')
  steps.push('Optional tips (max 3): more natural Mexican expressions, accent reminders or regional notes. Clearly marked as tips, not mistakes.')
  steps.push('Focus for next time: the 1–2 most important things for me to practise.')
  steps.push('At the very end, the JSON block below.')
  parts.push(`Please reply in ${lang}, in this order:\n${steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}`)
  parts.push(`\`\`\`json
{"summary": "your overall feedback in one or two sentences",
 "focus": ["most important thing to practise", "second thing"],
 "errors": [
  {"original": "the full sentence as I wrote it", "correction": "the same sentence with only the real mistakes fixed", "explanation": "short reason(s) in ${lang}", "topic": "pret-imp"}
 ]}
\`\`\`

Rules for the JSON:
- "errors" contains ONLY real mistakes (never accents, capitals, punctuation, regional variants or style).
- One entry per sentence: if a sentence has several real mistakes, fix them all in "correction" and list them briefly in "explanation".
- "topic" must be one of: ${topicList}, or "other".
- If there are no real mistakes, use "errors": [].`)
  return parts.join('\n\n')
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
export interface ParsedCorrections {
  errors: ImportedError[]
  summary?: string
  focus?: string[]
  problem?: string
}

export function parseCorrections(raw: string): ParsedCorrections {
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
  const obj = (Array.isArray(data) ? {} : data) as { summary?: unknown; focus?: unknown }
  const summary = typeof obj.summary === 'string' && obj.summary.trim() ? obj.summary.trim() : undefined
  const focus = Array.isArray(obj.focus) ? obj.focus.filter((f): f is string => typeof f === 'string' && !!f.trim()) : undefined
  return { errors, ...(summary ? { summary } : {}), ...(focus?.length ? { focus } : {}) }
}

/**
 * Safety net on import: drop "mistakes" that only differ in accents, capitals or punctuation,
 * and merge several entries for the same sentence into one review card.
 */
export function cleanCorrections(errors: ImportedError[]): { kept: ImportedError[]; dropped: number } {
  const byOriginal = new Map<string, ImportedError>()
  let dropped = 0
  for (const e of errors) {
    if (normalize(e.original, false) === normalize(e.correction, false)) {
      dropped++
      continue
    }
    const key = normalize(e.original, false)
    const prev = byOriginal.get(key)
    if (!prev) byOriginal.set(key, { ...e })
    else {
      if (e.explanation && !prev.explanation.includes(e.explanation)) prev.explanation = prev.explanation ? `${prev.explanation}; ${e.explanation}` : e.explanation
      prev.topic ??= e.topic
      if (e.correction.length > prev.correction.length && normalize(e.correction, false) !== normalize(prev.correction, false)) prev.correction = e.correction
    }
  }
  return { kept: [...byOriginal.values()], dropped }
}

export function countSentences(text: string): number {
  return text
    .split(/[.!?…]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2).length
}
