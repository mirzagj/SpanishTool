import { describe, expect, it } from 'vitest'
import { checkAnswer, diffChars, hintFor, normalize, phoneticKey, shuffleWords, unscrambleWords } from './check'

const lenient = { accentStrict: false }
const strict = { accentStrict: true }

describe('normalize', () => {
  it('ignores case, punctuation and extra spaces', () => {
    expect(normalize('  ¿Qué  HORA es? ', true)).toBe('qué hora es')
  })
  it('strips accents when lenient', () => {
    expect(normalize('Está aquí, señor', false)).toBe('esta aqui senor')
  })
  it('treats fútbol/futbol as equal', () => {
    expect(normalize('Jugaba fútbol', true)).toBe(normalize('jugaba futbol', true))
  })
})

describe('checkAnswer', () => {
  it('accepts exact answers and alternatives', () => {
    expect(checkAnswer('fui', ['fui'], lenient).correct).toBe(true)
    expect(checkAnswer('Hacía', ['hacía', 'estaba'], strict).correct).toBe(true)
    expect(checkAnswer('estaba', ['hacía', 'estaba'], strict).correct).toBe(true)
  })
  it('is accent-lenient by default but warns', () => {
    const r = checkAnswer('hacia', ['hacía'], lenient)
    expect(r.correct).toBe(true)
    expect(r.accentWarning).toBe(true)
  })
  it('requires accents in strict mode', () => {
    const r = checkAnswer('hacia', ['hacía'], strict)
    expect(r.correct).toBe(false)
    expect(r.accentOnly).toBe(true)
  })
  it('tolerates an added or omitted subject pronoun', () => {
    expect(checkAnswer('Yo no sé qué decir', ['No sé qué decir.'], strict).correct).toBe(true)
    expect(checkAnswer('Siempre dice la verdad', ['Ella siempre dice la verdad.'], strict).correct).toBe(true)
  })
  it('does not let one pronoun replace another', () => {
    expect(checkAnswer('Ella fue al cine', ['Él fue al cine.'], strict).correct).toBe(false)
  })
  it('ignores punctuation such as ¿ ? and commas', () => {
    expect(checkAnswer('Cuando era niño jugaba futbol', ['Cuando era niño, jugaba futbol.'], strict).correct).toBe(true)
    expect(checkAnswer('a que hora empieza la pelicula', ['¿A qué hora empieza la película?'], lenient).correct).toBe(true)
  })
  it('accepts a missing article for vocabulary with a warning', () => {
    const r = checkAnswer('partido', ['el partido'], { accentStrict: false, articleLenient: true })
    expect(r.correct).toBe(true)
    expect(r.articleWarning).toBe(true)
    expect(checkAnswer('partido', ['el partido'], lenient).correct).toBe(false)
  })
  it('picks the closest answer for feedback', () => {
    const r = checkAnswer('Ayer fui al gimnasio y hice ejercisio', ['Ayer fui al gimnasio e hice ejercicio.', 'Ayer fui al gimnasio y hice ejercicio.'], lenient)
    expect(r.correct).toBe(false)
    expect(r.best).toBe('Ayer fui al gimnasio y hice ejercicio.')
  })
  it('rejects empty input', () => {
    expect(checkAnswer('   ', ['fui'], lenient).correct).toBe(false)
  })
})

describe('diffChars', () => {
  it('marks wrong, missing and accent-only characters', () => {
    const { you, exp } = diffChars('hacia frio', 'Hacía frío.')
    expect(you.map((s) => s.k)).toContain('acc')
    expect(exp.find((s) => s.k === 'acc')?.t).toBe('í')
    const d2 = diffChars('fue', 'fui')
    expect(d2.you.some((s) => s.k === 'del' && s.t === 'e')).toBe(true)
    expect(d2.exp.some((s) => s.k === 'add' && s.t === 'i')).toBe(true)
  })
  it('does not highlight punctuation or case', () => {
    const { you, exp } = diffChars('que hora es', '¿Qué hora es?')
    expect(you.every((s) => s.k === 'eq' || s.k === 'acc')).toBe(true)
    expect(exp.every((s) => s.k !== 'add' || /^[¿?]+$/.test(s.t))).toBe(true)
  })
})

describe('unscramble helpers', () => {
  it('splits into words without punctuation, first word lower-cased', () => {
    expect(unscrambleWords('¿A qué hora llegaste anoche?')).toEqual(['a', 'qué', 'hora', 'llegaste', 'anoche'])
  })
  it('shuffles deterministically and never returns the original order', () => {
    const w = ['no', 'lo', 'voy', 'a', 'hacer']
    const a = shuffleWords(w, 'x')
    expect(a).toEqual(shuffleWords(w, 'x'))
    expect(a.join(' ')).not.toBe(w.join(' '))
    expect([...a].sort()).toEqual([...w].sort())
  })
})

describe('hintFor', () => {
  it('reveals letters progressively', () => {
    expect(hintFor('el partido', 1)).toBe('e· p······')
    expect(hintFor('el partido', 2)).toBe('el pa·····')
  })
})

describe('lenient checking: synonyms, regional words, small slips', () => {
  const g = { accentStrict: false }
  const v = { accentStrict: false, mode: 'vocab' as const, articleLenient: true }
  it('accepts a synonym for vocabulary, with a note', () => {
    const r = checkAnswer('pues', ['bueno'], { ...v, synonyms: ['pues', 'entonces'] })
    expect(r.verdict).toBe('correct')
    expect(r.notes[0]).toMatchObject({ kind: 'synonym', to: 'bueno' })
  })
  it('accepts Spain / everyday variants in sentences, with a note', () => {
    const r = checkAnswer('Se me olvidó el móvil en el coche', ['Se me olvidó el celular en el carro.'], g)
    expect(r.verdict).toBe('correct')
    expect(r.notes.map((n) => `${n.from}>${n.to}`)).toEqual(['móvil>celular', 'coche>carro'])
    expect(checkAnswer('Mis padres viven en Rotterdam', ['Mis papás viven en Rotterdam.'], g).verdict).toBe('correct')
    // a different gender still has to match its article
    expect(checkAnswer('el computadora', ['la computadora'], g).verdict).not.toBe('correct')
  })
  it('gives partial credit for spelling slips that sound the same', () => {
    expect(checkAnswer('estubo', ['estuvo'], g).verdict).toBe('almost')
    expect(checkAnswer('conosco', ['conozco'], g).verdict).toBe('almost')
    expect(checkAnswer('hiso', ['hizo'], g).verdict).toBe('almost')
    const r = checkAnswer('Ayer fui al cine y bi una pelicula', ['Ayer fui al cine y vi una película.'], g)
    expect(r.verdict).toBe('almost')
    expect(r.notes[0]).toMatchObject({ kind: 'spelling', from: 'bi', to: 'vi' })
  })
  it('keeps real grammar mistakes wrong', () => {
    expect(checkAnswer('fue', ['fui'], g).verdict).toBe('wrong') // person
    expect(checkAnswer('iba', ['fui'], g).verdict).toBe('wrong') // tense
    expect(checkAnswer('dijieron', ['dijeron'], g).verdict).toBe('wrong') // the trained irregularity
    expect(checkAnswer('hablaba', ['hablé'], g).verdict).toBe('wrong')
    expect(checkAnswer('Ayer fue al cine', ['Ayer fui al cine.'], g).verdict).toBe('wrong') // ending in a sentence
  })
  it('allows a typo in a longer sentence word, and any small slip in vocabulary', () => {
    expect(checkAnswer('Estaba viendo la tele cuando entró mi hermnao', ['Estaba viendo la tele cuando entró mi hermano.'], g).verdict).toBe('almost')
    expect(checkAnswer('el partdo', ['el partido'], v).verdict).toBe('almost')
    expect(checkAnswer('la mesa', ['el partido'], v).verdict).toBe('wrong')
  })
  it('does not give partial credit in exact mode (unscramble / pairs)', () => {
    expect(checkAnswer('estubo', ['estuvo'], { accentStrict: false, mode: 'exact' }).verdict).toBe('wrong')
  })
  it('sound-alike key', () => {
    expect(phoneticKey('llegué')).toBe(phoneticKey('yegue'))
    expect(phoneticKey('llegué')).not.toBe(phoneticKey('llegé'))
    expect(phoneticKey('gente')).toBe(phoneticKey('jente'))
    expect(phoneticKey('guerra')).not.toBe(phoneticKey('jerra'))
  })
})
