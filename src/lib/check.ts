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

export type Verdict = 'correct' | 'almost' | 'wrong'
/** What was lenient about an answer (also used by the mistake analysis). */
export type CheckFlag = 'accent' | 'article' | 'spelling' | 'synonym' | 'regional'

export interface CheckNote {
  kind: 'spelling' | 'synonym' | 'regional'
  /** what you typed */
  from: string
  /** what the answer has */
  to: string
}

export interface CheckResult {
  verdict: Verdict
  /** verdict === 'correct' */
  correct: boolean
  /** Matched except for accents and accents are optional. */
  accentWarning: boolean
  /** Only accents differ, but accents are required. */
  accentOnly: boolean
  /** Answer was right but missing the article (vocabulary). */
  articleWarning: boolean
  /** The accepted answer closest to what was typed (for feedback / diff). */
  best: string
  notes: CheckNote[]
  flags: CheckFlag[]
}

export interface CheckOptions {
  accentStrict: boolean
  /** Vocabulary: accept a missing article with a warning. */
  articleLenient?: boolean
  /** Other words that also fit (vocabulary synonyms); accepted with a note. */
  synonyms?: string[]
  /**
   * 'grammar' (default): spelling slips get partial credit, but changed endings stay wrong
   * (they carry tense / person). 'vocab': any small slip gets partial credit.
   * 'exact': no partial credit (unscramble, choose-and-explain).
   */
  mode?: 'grammar' | 'vocab' | 'exact'
}

/**
 * Regional / everyday synonyms: Mexican form first. Either form is accepted;
 * a note mentions the form used in the answer. Gendered pairs are listed with articles.
 */
const REGIONAL: string[][] = [
  ['el carro', 'el coche', 'el auto'],
  ['un carro', 'un coche', 'un auto'],
  ['carro', 'coche', 'auto'],
  ['el celular', 'el móvil', 'el teléfono'],
  ['celular', 'móvil', 'teléfono'],
  ['la computadora', 'el ordenador', 'la compu'],
  ['una computadora', 'un ordenador'],
  ['computadora', 'ordenador', 'compu'],
  ['la laptop', 'el portátil'],
  ['el camión', 'el autobús', 'el bus'],
  ['camión', 'autobús'],
  ['el boleto', 'el billete'],
  ['boleto', 'billete'],
  ['el departamento', 'el piso', 'el apartamento'],
  ['departamento', 'apartamento'],
  ['jugo', 'zumo'],
  ['los lentes', 'las gafas'],
  ['lentes', 'gafas'],
  ['alberca', 'piscina'],
  ['papás', 'padres'],
  ['enojado', 'enfadado'],
  ['enojada', 'enfadada'],
  ['enojados', 'enfadados'],
  ['la recámara', 'el dormitorio', 'la habitación', 'el cuarto'],
  ['recámara', 'dormitorio', 'habitación', 'cuarto'],
  ['el refri', 'el refrigerador', 'la nevera'],
  ['chamarra', 'chaqueta'],
  ['mesero', 'camarero'],
  ['mesera', 'camarera'],
  ['manejar', 'conducir'],
  ['estacionar', 'aparcar'],
  ['rentar', 'alquilar'],
  ['platicar', 'charlar'],
  ['platicando', 'charlando'],
  ['ahorita', 'ahora'],
  ['la chamba', 'el trabajo'],
  ['chamba', 'trabajo'],
  ['la lana', 'el dinero'],
  ['tal vez', 'quizás', 'quizá', 'a lo mejor'],
  ['en la mañana', 'por la mañana'],
  ['en la tarde', 'por la tarde'],
  ['en la noche', 'por la noche'],
  ['ayer en la noche', 'anoche', 'ayer por la noche'],
  ['sombrilla', 'paraguas'],
  ['la película', 'la peli'],
]

const REGIONAL_INDEX = REGIONAL.flatMap((g, gi) => g.map((p, mi) => ({ p: normalize(p, false), gi, mi, orig: p })))
  .sort((a, b) => b.p.length - a.p.length)

/** Replace regional synonyms by a group token; returns the members found (in order). */
function canonRegional(s: string): { text: string; found: { gi: number; word: string }[] } {
  let text = ` ${s} `
  const found: { gi: number; word: string; pos: number }[] = []
  for (const { p, gi, orig } of REGIONAL_INDEX) {
    let i = text.indexOf(` ${p} `)
    while (i >= 0) {
      found.push({ gi, word: orig, pos: i })
      text = `${text.slice(0, i)} \u0000${gi} ${text.slice(i + p.length + 2)}`
      i = text.indexOf(` ${p} `)
    }
  }
  return { text: text.trim(), found: found.sort((a, b) => a.pos - b.pos).map(({ gi, word }) => ({ gi, word })) }
}

/** Sounds-the-same key: catches b/v, s/z/c, ll/y, g/j, silent h. */
export function phoneticKey(w: string): string {
  return stripAccents(w)
    .replace(/ch/g, '\u0001')
    .replace(/h/g, '')
    .replace(/qu([ei])/g, 'k$1')
    .replace(/gu([ei])/g, '\u0002$1')
    .replace(/g([ei])/g, 'j$1')
    .replace(/\u0002/g, 'g')
    .replace(/c([ei])/g, 's$1')
    .replace(/\u0001/g, 'ch')
    .replace(/c(?!h)/g, 'k')
    .replace(/ll/g, 'y')
    .replace(/v/g, 'b')
    .replace(/z/g, 's')
}

/** Optimal string alignment distance (Levenshtein + adjacent swaps). */
export function osa(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[m][n]
}

const isSwap = (a: string, b: string) => a.length === b.length && a !== b && osa(a, b) === 1 && levenshtein(a, b) === 2

/** The difference is only in the last two letters (where Spanish keeps tense / person / gender). */
function endingOnly(a: string, b: string): boolean {
  let p = 0
  while (p < a.length && p < b.length && a[p] === b[p]) p++
  return p >= a.length - 2 && p >= b.length - 2
}

/** A small slip in one word (not a different form). */
function isSlip(w: string, target: string, mode: 'grammar' | 'vocab', single: boolean): boolean {
  if (w === target) return true
  if (target.length >= 2 && phoneticKey(w) === phoneticKey(target)) return true
  if (target.length < 4) return false
  if (isSwap(w, target) && !endingOnly(w, target)) return true
  if (mode === 'grammar' && single) return false
  const limit = target.length >= 9 ? 2 : 1
  if (osa(w, target) > limit) return false
  return mode === 'vocab' || !endingOnly(w, target)
}

function nearMiss(u: string, a: string, mode: 'grammar' | 'vocab'): CheckNote[] | null {
  const uw = u.split(' ')
  const aw = a.split(' ')
  if (uw.length !== aw.length) return null
  const diffs = aw.map((_, i) => i).filter((i) => uw[i] !== aw[i])
  if (!diffs.length || diffs.length > (aw.length >= 8 ? 2 : 1)) return null
  for (const i of diffs) if (!isSlip(uw[i], aw[i], mode, aw.length === 1)) return null
  return diffs.map((i) => ({ kind: 'spelling' as const, from: uw[i], to: aw[i] }))
}

/** Pairs to try: as typed, and with a subject pronoun added / left out. */
function variants(u: string, a: string): [string, string][] {
  const out: [string, string][] = [[u, a]]
  const su = stripSubject(u)
  if (su !== null) out.push([su, a])
  const sa = stripSubject(a)
  if (sa !== null) out.push([u, sa])
  return out
}

export function checkAnswer(input: string, answers: string[], opts: CheckOptions): CheckResult {
  const mode = opts.mode ?? 'grammar'
  const base: CheckResult = { verdict: 'wrong', correct: false, accentWarning: false, accentOnly: false, articleWarning: false, best: answers[0] ?? '', notes: [], flags: [] }
  const ok = (r: Partial<CheckResult>): CheckResult => ({ ...base, verdict: 'correct', correct: true, ...r })
  const strictU = normalize(input, true)
  const lenU = normalize(input, false)
  if (!strictU) return base

  for (const a of answers) {
    if (eqFlexible(strictU, normalize(a, true), !opts.articleLenient)) return ok({ best: a })
  }
  for (const a of answers) {
    if (eqFlexible(lenU, normalize(a, false), !opts.articleLenient)) {
      if (opts.accentStrict) return { ...base, accentOnly: true, best: a, flags: ['accent'] }
      return ok({ accentWarning: true, best: a, flags: ['accent'] })
    }
  }
  if (opts.articleLenient) {
    for (const a of answers) {
      const bare = stripArticle(normalize(a, false))
      if (bare && bare === lenU) {
        const accentsOk = stripArticle(normalize(a, true)) === strictU
        if (!accentsOk && opts.accentStrict) return { ...base, accentOnly: true, best: a, flags: ['accent'] }
        return ok({ articleWarning: true, accentWarning: !accentsOk, best: a, flags: accentsOk ? ['article'] : ['article', 'accent'] })
      }
    }
  }
  if (mode === 'exact') return { ...base, best: closest(lenU, answers) }

  // another word that also fits (vocabulary)
  for (const syn of opts.synonyms ?? []) {
    const sn = normalize(syn, false)
    if (sn === lenU || stripArticle(sn) === lenU) return ok({ best: answers[0], notes: [{ kind: 'synonym', from: input.trim(), to: answers[0] }], flags: ['synonym'] })
  }

  // regional synonyms (coche = carro …)
  const cu = canonRegional(lenU)
  for (const a of answers) {
    const ca = canonRegional(normalize(a, false))
    if (cu.found.length && eqFlexible(cu.text, ca.text)) {
      const notes: CheckNote[] = []
      cu.found.forEach((f) => {
        const other = ca.found.find((x) => x.gi === f.gi)
        if (other && other.word !== f.word) {
          // "el móvil" / "el celular" → "móvil" / "celular" (keep articles only when they differ)
          const [fa, ...fr] = f.word.split(' ')
          const [oa, ...or] = other.word.split(' ')
          const same = fr.length && or.length && fa === oa
          notes.push({ kind: 'regional', from: same ? fr.join(' ') : f.word, to: same ? or.join(' ') : other.word })
        }
      })
      return ok({ best: a, notes, flags: ['regional'] })
    }
  }

  // small slips: partial credit
  for (const a of answers) {
    const ca = canonRegional(normalize(a, false)).text
    for (const [u, x] of variants(cu.text, ca)) {
      const notes = nearMiss(u, x, mode)
      if (notes) {
        const named = notes.map((n) => ({ ...n, from: n.from.replace(/\u0000\d+/g, '…'), to: n.to.replace(/\u0000\d+/g, '…') }))
        return { ...base, verdict: 'almost', best: a, notes: named, flags: ['spelling'] }
      }
    }
  }
  return { ...base, best: closest(lenU, answers) }
}

function closest(lenU: string, answers: string[]): string {
  let best = answers[0] ?? ''
  let bestD = Infinity
  for (const a of answers) {
    const d = levenshtein(lenU, normalize(a, false))
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return best
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
