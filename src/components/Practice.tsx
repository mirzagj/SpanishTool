import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { checkAnswer, diffChars, hintFor, type CheckFlag, type CheckResult, type Seg, type Verdict } from '../lib/check'
import { db } from '../lib/db'
import type { PracticeItem } from '../lib/items'
import { addAlternative } from '../lib/practice'
import { useT } from '../lib/i18n'
import { useSettings } from '../lib/settings'
import { Icon } from './Icon'
import { Button, Chip, cx, inputCls } from './ui'

export interface PracticeResult {
  /** correct (or overridden); 'almost' answers are not correct but get partial credit */
  correct: boolean
  verdict: Verdict
  flags: CheckFlag[]
  answer: string
  overridden: boolean
  hintsUsed: number
  firstTry: boolean
}

const ACCENTS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡']

/** Renders a sentence, highlighting the ___ gap. */
export function GapText({ text }: { text: string }) {
  const parts = text.split('___')
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="mx-0.5 inline-block min-w-12 border-b-2 border-stone-400 align-baseline dark:border-stone-500">&nbsp;</span>}
        </span>
      ))}
    </>
  )
}

export function DiffLine({ segs, label }: { segs: Seg[]; label: string }) {
  return (
    <div className="flex gap-2 text-[15px] leading-relaxed">
      <span className="w-16 shrink-0 pt-px text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">{label}</span>
      <span className="min-w-0 break-words">
        {segs.map((s, i) => (
          <span
            key={i}
            className={cx(
              s.k === 'del' && 'rounded bg-rose-100 text-rose-800 line-through decoration-rose-400 dark:bg-rose-950 dark:text-rose-300',
              s.k === 'add' && 'rounded bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
              s.k === 'acc' && 'rounded bg-amber-100 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300',
            )}
          >
            {s.t}
          </span>
        ))}
      </span>
    </div>
  )
}

function AccentBarImpl({ onInsert }: { onInsert: (c: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {ACCENTS.map((c) => (
        <button
          key={c}
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(c)}
          className="h-8 min-w-8 rounded-lg border border-stone-200 bg-white px-2 text-[15px] text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
        >
          {c}
        </button>
      ))}
    </div>
  )
}

function Note({ label, children, tone = 'stone' }: { label: string; children: ReactNode; tone?: 'stone' | 'sky' }) {
  return (
    <div
      className={cx(
        'rounded-xl px-3.5 py-2.5 text-[15px]',
        tone === 'stone' ? 'bg-stone-100 dark:bg-stone-800/70' : 'bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
      )}
    >
      <span className="mr-1.5 text-xs font-semibold tracking-wide uppercase opacity-60">{label}</span>
      {children}
    </div>
  )
}

export function PracticeCard({
  item,
  onNext,
  retry = false,
}: {
  item: PracticeItem
  onNext: (r: PracticeResult) => void
  /** Second try in the same session (shown as such). */
  retry?: boolean
}) {
  const s = useSettings()
  const t = useT()
  const alts = useLiveQuery(() => db.alts.get(item.key), [item.key])
  const [value, setValue] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [choice, setChoice] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [overridden, setOverridden] = useState(false)
  const [hint, setHint] = useState(0)
  const [showMeaning, setShowMeaning] = useState(false)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const answerText =
    item.mode === 'unscramble' ? picked.map((i) => item.words![i]).join(' ') : item.mode === 'pair' ? (choice ?? '') : value
  const allAnswers = useMemo(() => [...item.answers, ...(alts?.answers ?? [])], [item.answers, alts])

  useEffect(() => {
    if (result) nextRef.current?.focus()
  }, [result])

  const check = () => {
    if (result || !answerText.trim()) return
    setResult(
      checkAnswer(answerText, allAnswers, { accentStrict: s.accentStrict, articleLenient: item.articleLenient, synonyms: item.synonyms, mode: item.checkMode ?? 'grammar' }),
    )
  }
  const next = () => {
    if (!result) return
    onNext({
      correct: result.correct || overridden,
      verdict: overridden ? 'correct' : result.verdict,
      flags: result.flags,
      answer: answerText,
      overridden,
      hintsUsed: hint,
      firstTry: !retry,
    })
  }
  const override = async () => {
    await addAlternative(item.key, answerText)
    setOverridden(true)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (result) next()
      else check()
    }
  }
  const insert = (c: string) => {
    const el = inputRef.current
    if (!el) return setValue((v) => v + c)
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const nv = value.slice(0, start) + c + value.slice(end)
    setValue(nv)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + c.length, start + c.length)
    })
  }

  const good = !!result && (result.correct || overridden)
  const almost = !!result && result.verdict === 'almost' && !overridden
  const showDiff = !!result && (!result.correct || result.accentWarning) && !overridden && item.mode !== 'pair'
  const diff = showDiff ? diffChars(answerText, result!.best) : null
  const otherAnswers = allAnswers.filter((a) => a !== result?.best)

  const inputProps = {
    ref: inputRef,
    value,
    disabled: !!result,
    onChange: (e: { target: { value: string } }) => setValue(e.target.value),
    onKeyDown: onKey,
    autoFocus: true,
    autoCapitalize: 'off',
    autoCorrect: 'off',
    autoComplete: 'off',
    spellCheck: false,
    lang: 'es',
    placeholder: 'Escribe aquí…',
    'aria-label': t('Your answer'),
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Chip>{t(item.label)}</Chip>
          {retry && <Chip tone="amber">{t('Second try')}</Chip>}
        </div>
        {item.instr && <p className="mb-1 text-[15px] text-stone-600 dark:text-stone-300">{t(item.instr)}</p>}
        {item.prompt && (
          <p className="text-[19px] leading-snug font-medium" lang={item.promptNotSpanish ? 'en' : 'es'}>
            {item.promptNotSpanish ? `“${item.prompt}”` : <GapText text={item.prompt} />}
          </p>
        )}
        {item.sub && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{item.sub}</p>}
        {item.meaning && !item.promptNotSpanish && !result && (
          showMeaning ? (
            <p className="mt-1.5 text-[15px] text-stone-500 italic dark:text-stone-400">{item.meaning}</p>
          ) : (
            <button
              type="button"
              onClick={() => setShowMeaning(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <Icon name="search" className="size-4" /> {t('Show meaning')}
            </button>
          )
        )}
      </div>

      {item.mode === 'type' &&
        (item.long ? (
          <textarea {...inputProps} rows={2} className={cx(inputCls, 'resize-none')} />
        ) : (
          <input {...inputProps} className={inputCls} />
        ))}
      {item.mode === 'type' && !result && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AccentBarImpl onInsert={insert} />
          {item.hints && (
            <button
              type="button"
              onClick={() => setHint((h) => h + 1)}
              className="mt-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <Icon name="bulb" className="size-4" /> {t('Hint')}
            </button>
          )}
        </div>
      )}
      {hint > 0 && !result && (
        <p className="font-mono text-[15px] tracking-wider text-stone-600 dark:text-stone-300">{hintFor(item.answers[0], hint)}</p>
      )}

      {item.mode === 'unscramble' && (
        <div className="space-y-3">
          <div className="flex min-h-14 flex-wrap gap-1.5 rounded-xl border border-dashed border-stone-300 p-2 dark:border-stone-700">
            {picked.map((i, pos) => (
              <button
                key={pos}
                type="button"
                disabled={!!result}
                onClick={() => setPicked((p) => p.filter((_, k) => k !== pos))}
                className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-[15px] text-white dark:bg-stone-100 dark:text-stone-900"
              >
                {item.words![i]}
              </button>
            ))}
          </div>
          {!result && (
            <div className="flex flex-wrap gap-1.5">
              {item.words!.map((w, i) =>
                picked.includes(i) ? null : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPicked((p) => [...p, i])}
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[15px] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
                  >
                    {w}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {item.mode === 'pair' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {item.options!.map((o) => (
              <button
                key={o}
                type="button"
                disabled={!!result}
                onClick={() => setChoice(o)}
                className={cx(
                  'rounded-xl border-2 px-3 py-3 text-[17px] font-medium transition-colors',
                  choice === o
                    ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                    : 'border-stone-200 bg-white hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900',
                  result && o === item.answers[0] && 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-stone-950',
                )}
              >
                {o}
              </button>
            ))}
          </div>
          {!result && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={onKey}
              rows={2}
              placeholder={t('Why? Explain the rule in a few words (optional)')}
              className={cx(inputCls, 'resize-none text-[15px]')}
            />
          )}
        </div>
      )}

      {!result ? (
        <Button size="lg" onClick={check} disabled={!answerText.trim()}>
          {t('Check')}
        </Button>
      ) : (
        <div className="space-y-3" aria-live="polite">
          <div
            className={cx(
              'flex items-center gap-2 rounded-xl px-3.5 py-3 font-semibold',
              good
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : almost
                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
            )}
          >
            <Icon name={good ? 'check' : almost ? 'bulb' : 'x'} className="size-5" strokeWidth={good ? 3 : 2} />
            {almost
              ? t('Almost! A small spelling slip — counts as half right.')
              : overridden
              ? t('Counted as correct — your answer is now accepted too.')
              : result.correct
                ? result.accentWarning
                  ? t('Correct — mind the accents.')
                  : result.flags.includes('synonym') || result.flags.includes('regional')
                    ? t('Correct — another good option.')
                    : t('Correct!')
                : result.accentOnly
                  ? t('Only the accents are off (accents are required in your settings).')
                  : t('Not quite.')}
          </div>
          {!overridden && result.notes.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-stone-100 px-3.5 py-2.5 text-[15px] dark:bg-stone-800/70">
              {result.notes.map((n, i) => (
                <li key={i} lang="es">
                  {n.kind === 'spelling'
                    ? t('Spelling: “{a}” → “{b}”', { a: n.from, b: n.to })
                    : n.kind === 'synonym'
                      ? t('“{a}” also fits here — this card practises “{b}”.', { a: n.from, b: n.to })
                      : t('“{a}” is fine too — the answer uses “{b}”.', { a: n.from, b: n.to })}
                </li>
              ))}
            </ul>
          )}
          {result.articleWarning && !overridden && (
            <Note label={t('Gender')}>
              {t('Learn it with its article:')} <b lang="es">{result.best}</b>
            </Note>
          )}
          {diff && (
            <div className="space-y-1 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
              <DiffLine label={t('You')} segs={diff.you} />
              <DiffLine label={t('Correct')} segs={diff.exp} />
            </div>
          )}
          {good && !overridden && result.best !== item.answers[0] && (
            <Note label={t('Also')}>
              <span lang="es">{item.answers[0]}</span>
            </Note>
          )}
          {item.mode === 'pair' && reason.trim() && <Note label={t('Your reason')}>{reason}</Note>}
          {item.meaning && !item.promptNotSpanish && (
            <Note label={t('Meaning')}>{item.meaning}</Note>
          )}
          {item.after && (
            <Note label={t('Example')}>
              <span lang="es">{item.after}</span>
            </Note>
          )}
          {item.explain && <Note label={t('Rule')}>{item.explain}</Note>}
          {item.spain && (
            <Note label={t('Spain · recognise only')} tone="sky">
              <span lang="es">{item.spain}</span>
            </Note>
          )}
          {otherAnswers.length > 0 && item.mode !== 'pair' && (
            <details className="text-sm text-stone-500 dark:text-stone-400">
              <summary className="cursor-pointer select-none">{t('Other accepted answers ({n})', { n: otherAnswers.length })}</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5" lang="es">
                {otherAnswers.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <Button ref={nextRef} size="lg" onClick={next}>
              {t('Next')}
            </Button>
            {!result.correct && !overridden && (
              <Button variant="ghost" onClick={override}>
                {t('I was actually right')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
