/**
 * Answer checking: normalise case / whitespace / punctuation, accent-lenient by default,
 * tolerant of an added or omitted subject pronoun, plus a character diff for feedback.
 */

const PUNCT = /[¿¡?!.,;:"“”„«»()[\]…–—]/g
const QUOTES = /[‘’´`]/g

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
}

/** Spelling variants that should never count as mistakes. */
const EQUIV: [RegExp, string][] = [
  [/\bfútbol\b/g, 'futbol'],
  [/\bvídeo(s?)\b/g, 'video$1'],
  [/\bchófer\b/g, 'chofer'],
  [/\bokey\b/g, 'ok'],
]

export function normalize(s: string, keepAccents: boolean): string {
  let t = s.normalize('NFC').toLowerCase().replace(QUOTES, "'").replace(PUNCT, ' ').replace(/\s+/g, ' ').trim()
  for (const [re, rep] of EQUIV) t = t.replace(re, rep)
  return keepAccents ? t : stripAccents(t)
}

// 'el' (without accent) is left out on purpose: it is also the article.
const SUBJECT_PRONOUNS = ['yo', 'tú', 'tu', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'ustedes', 'ellos', 'ellas']

function stripSubject(s: string): string | null {
  const sp = s.indexOf(' ')
  if (sp < 0) return null
  return SUBJECT_PRONOUNS.includes(s.slice(0, sp)) ? s.slice(sp + 1) : null
}

const ARTICLES = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas']
function stripArticle(s: string): string | null {
  const sp = s.indexOf(' ')
  if (sp < 0) return null
  return ARTICLES.includes(s.slice(0, sp)) ? s.slice(sp + 1) : null
}

/** Equal, allowing the user to add or omit a leading subject pronoun (but not to swap one for another). */
function eqFlexible(u: string, a: string, pronouns = true): boolean {
  if (u === a) return true
  if (!pronouns) return false
  const su = stripSubject(u)
  if (su !== null && su === a) return true
  const sa = stripSubject(a)
  if (sa !== null && sa === u) return true
  return false
}

export interface CheckResult {
  correct: boolean
  /** Matched except for accents and accents are optional. */
  accentWarning: boolean
  /** Only accents differ, but accents are required. */
  accentOnly: boolean
  /** Answer was right but missing the article (vocabulary). */
  articleWarning: boolean
  /** The accepted answer closest to what was typed (for feedback / diff). */
  best: string
}

export interface CheckOptions {
  accentStrict: boolean
  /** Vocabulary: accept a missing article with a warning. */
  articleLenient?: boolean
}

export function checkAnswer(input: string, answers: string[], opts: CheckOptions): CheckResult {
  const res: CheckResult = { correct: false, accentWarning: false, accentOnly: false, articleWarning: false, best: answers[0] ?? '' }
  const strictU = normalize(input, true)
  const lenU = normalize(input, false)
  if (!strictU) return res

  for (const a of answers) {
    if (eqFlexible(strictU, normalize(a, true), !opts.articleLenient)) return { ...res, correct: true, best: a }
  }
  for (const a of answers) {
    if (eqFlexible(lenU, normalize(a, false), !opts.articleLenient)) {
      if (opts.accentStrict) return { ...res, accentOnly: true, best: a }
      return { ...res, correct: true, accentWarning: true, best: a }
    }
  }
  if (opts.articleLenient) {
    for (const a of answers) {
      const bare = stripArticle(normalize(a, false))
      if (bare && bare === lenU) {
        const accentsOk = stripArticle(normalize(a, true)) === strictU
        if (!accentsOk && opts.accentStrict) return { ...res, accentOnly: true, best: a }
        return { ...res, correct: true, articleWarning: true, accentWarning: !accentsOk, best: a }
      }
    }
  }
  // closest answer for feedback
  let best = answers[0] ?? ''
  let bestD = Infinity
  for (const a of answers) {
    const d = levenshtein(lenU, normalize(a, false))
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return { ...res, best }
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = new Array(n + 1)
  let cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[n]
}

export type SegKind = 'eq' | 'add' | 'del' | 'acc'
export interface Seg {
  t: string
  k: SegKind
}

const NEUTRAL = /[\s¿¡?!.,;:"'«»()…–—-]/

/**
 * Character diff between what the user typed and the expected answer.
 * `you`: eq / del (extra or wrong chars) / acc (accent differs)
 * `exp`: eq / add (missing chars) / acc
 * Case differences and punctuation are not highlighted.
 */
export function diffChars(user: string, expected: string): { you: Seg[]; exp: Seg[] } {
  const a = [...user.trim().replace(/\s+/g, ' ')]
  const b = [...expected.trim()]
  const key = (c: string) => stripAccents(c.toLowerCase())
  const n = a.length
  const m = b.length
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = key(a[i]) === key(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const you: Seg[] = []
  const exp: Seg[] = []
  const push = (arr: Seg[], t: string, k: SegKind) => {
    const last = arr[arr.length - 1]
    if (last && last.k === k) last.t += t
    else arr.push({ t, k })
  }
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) {
      const k: SegKind = a[i].toLowerCase() === b[j].toLowerCase() ? 'eq' : 'acc'
      push(you, a[i], k)
      push(exp, b[j], k)
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(you, a[i], NEUTRAL.test(a[i]) ? 'eq' : 'del')
      i++
    } else {
      push(exp, b[j], NEUTRAL.test(b[j]) ? 'eq' : 'add')
      j++
    }
  }
  for (; i < n; i++) push(you, a[i], NEUTRAL.test(a[i]) ? 'eq' : 'del')
  for (; j < m; j++) push(exp, b[j], NEUTRAL.test(b[j]) ? 'eq' : 'add')
  return { you, exp }
}

/** Words for an unscramble exercise: punctuation removed, first word lower-cased. */
export function unscrambleWords(sentence: string): string[] {
  const words = sentence
    .replace(/[¿¡?!.,;:"«»]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length) words[0] = words[0].charAt(0).toLowerCase() + words[0].slice(1)
  return words
}

/** Deterministic shuffle that never returns the original order (when possible). */
export function shuffleWords(words: string[], seed: string): string[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  const out = [...words]
  for (let attempt = 0; attempt < 5; attempt++) {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    if (out.join(' ') !== words.join(' ')) break
  }
  return out
}

/** Progressive hint: reveal `level` letters per word, mask the rest. */
export function hintFor(answer: string, level: number): string {
  return answer
    .split(' ')
    .map((w) => [...w].map((c, i) => (i < level || /[^\p{L}]/u.test(c) ? c : '·')).join(''))
    .join(' ')
}
