import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, Card, Chip, SectionTitle, cx, inputCls } from '../../components/ui'
import { WRITING_IDEAS, WRITING_STATEMENTS } from '../../data/prompts'
import { topicShort } from '../../data/topics'
import { VOCAB_BY_ID, VOCAB_BY_THEME } from '../../data/vocab'
import { copyText } from '../../lib/clipboard'
import { buildCorrectionPrompt, cleanCorrections, countSentences, parseCorrections, type ImportedError } from '../../lib/correction'
import { db, type DayRecord, type Writing as WritingRow } from '../../lib/db'
import { useT } from '../../lib/i18n'
import { addMistakeWithCard } from '../../lib/practice'
import { useSettings } from '../../lib/settings'

type WordRow = NonNullable<WritingRow['words']>[number]

/** Three words to use in a sentence: recently learned ones from your deck, else from today's theme. */
async function pickWords(theme: DayRecord['theme'], lang: 'nl' | 'en', exclude: string[] = []): Promise<WordRow[]> {
  const cards = await db.cards.where('kind').equals('vocab').toArray()
  const recent = cards
    .sort((a, b) => b.created - a.created)
    .slice(0, 20)
    .map((c) => c.refId!)
    .filter((id) => VOCAB_BY_ID[id] && !exclude.includes(id))
  const pool = recent.length >= 3 ? recent : [...recent, ...(VOCAB_BY_THEME[theme] ?? []).map((v) => v.id).filter((id) => !exclude.includes(id) && !recent.includes(id))]
  const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
  return chosen.map((id) => ({ id, es: VOCAB_BY_ID[id].es, gloss: lang === 'nl' ? VOCAB_BY_ID[id].nl : VOCAB_BY_ID[id].en, sentence: '' }))
}

export function Writing({ day, onFinish }: { day: DayRecord; onFinish: () => void }) {
  const s = useSettings()
  const t = useT()
  // null = loaded, no draft yet (undefined means still loading)
  const existing = useLiveQuery(() => db.writings.where('date').equals(day.date).first().then((r) => r ?? null), [day.date])
  const [text, setText] = useState<string | null>(null)
  const [words, setWords] = useState<WordRow[]>([])
  const [idea, setIdea] = useState<{ kind: 'idea' | 'statement'; text: string } | null>(null)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const [reply, setReply] = useState('')
  const [parsed, setParsed] = useState<{ errors: (ImportedError & { on: boolean })[]; dropped: number } | null>(null)
  const [problem, setProblem] = useState('')
  const [imported, setImported] = useState<number | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  // load the draft once (text, chosen words, idea)
  useEffect(() => {
    if (text !== null || existing === undefined) return
    setText(existing?.text ?? '')
    setIdea(existing?.prompt ? { kind: existing.promptKind ?? 'idea', text: existing.prompt } : null)
    if (existing?.words?.length) setWords(existing.words)
    else void pickWords(day.theme, s.promptLang).then(setWords)
  }, [existing, text, day.theme, s.promptLang])

  const save = async (patch: Partial<WritingRow>) => {
    const row = await db.writings.where('date').equals(day.date).first()
    if (row) await db.writings.update(row.id!, { ...patch, ts: Date.now() })
    else await db.writings.add({ date: day.date, ts: Date.now(), topic: day.topic, prompt: idea?.text ?? '', promptKind: idea?.kind, text: text ?? '', imported: 0, words, ...patch })
  }
  const later = (patch: Partial<WritingRow>) => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void save(patch), 600)
  }
  const onText = (v: string) => {
    setText(v)
    later({ text: v, words })
  }
  const onSentence = (i: number, v: string) => {
    const next = words.map((w, k) => (k === i ? { ...w, sentence: v } : w))
    setWords(next)
    later({ text: text ?? '', words: next })
  }
  const otherWords = async () => {
    const next = await pickWords(day.theme, s.promptLang, words.map((w) => w.id))
    setWords(next)
    void save({ words: next })
  }
  const pick = (kind: 'idea' | 'statement') => {
    const list = kind === 'idea' ? WRITING_IDEAS : WRITING_STATEMENTS
    const options = list.filter((x) => x !== idea?.text)
    const next = { kind, text: options[Math.floor(Math.random() * options.length)] }
    setIdea(next)
    void save({ prompt: next.text, promptKind: kind })
  }
  const clearIdea = () => {
    setIdea(null)
    void save({ prompt: '', promptKind: undefined })
  }

  if (text === null) return null
  const n = countSentences(text)
  const filledWords = words.filter((w) => w.sentence.trim())
  const hasSomething = n > 0 || filledWords.length > 0

  const copy = async () => {
    await save({ text, words })
    const ok = await copyText(buildCorrectionPrompt({ text, words, lang: s.promptLang, topic: idea ?? undefined }))
    setCopied(ok ? 'ok' : 'fail')
  }

  const read = async () => {
    const r = parseCorrections(reply)
    if (r.problem) {
      setProblem(t(r.problem))
      setParsed(null)
      return
    }
    const { kept, dropped } = cleanCorrections(r.errors)
    setProblem('')
    setParsed({ errors: kept.map((e) => ({ ...e, on: true })), dropped })
    setImported(null)
    if (r.summary || r.focus) await save({ feedback: { summary: r.summary, focus: r.focus } })
  }

  const doImport = async () => {
    const chosen = (parsed?.errors ?? []).filter((e) => e.on)
    for (const e of chosen) {
      await addMistakeWithCard({ source: 'writing', wrong: e.original, correct: e.correction, explain: e.explanation, topic: e.topic, prompt: idea?.text ?? '' }, day.date)
    }
    const row = await db.writings.where('date').equals(day.date).first()
    if (row) await db.writings.update(row.id!, { imported: (row.imported ?? 0) + chosen.length })
    setImported(chosen.length)
    setParsed(null)
    setReply('')
  }

  const feedback = existing?.feedback

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <p className="text-[17px] font-semibold">{t('Free writing')}</p>
        <p className="text-[15px] text-stone-600 dark:text-stone-300">
          {t('Write about anything — your day, something that happened, plans, an opinion. A few sentences is enough, and it doesn’t have to be perfect.')}
        </p>
        {idea ? (
          <div className="rounded-xl bg-stone-100 px-3 py-2 dark:bg-stone-800">
            {idea.kind === 'statement' && (
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('Do you agree? Give your opinion and say why.')}</p>
            )}
            <p className="text-[15px]" lang="es">
              {idea.kind === 'statement' ? `«${idea.text}»` : idea.text}
            </p>
            <div className="mt-1 flex gap-4 text-sm">
              <button type="button" onClick={() => pick(idea.kind)} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
                {t('Another')}
              </button>
              <button type="button" onClick={() => pick(idea.kind === 'idea' ? 'statement' : 'idea')} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
                {idea.kind === 'idea' ? t('A statement instead') : t('An idea instead')}
              </button>
              <button type="button" onClick={clearIdea} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
                {t('I’ll write my own')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <button type="button" onClick={() => pick('idea')} className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300">
              <Icon name="bulb" className="size-4" /> {t('Need an idea?')}
            </button>
            <button type="button" onClick={() => pick('statement')} className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300">
              <Icon name="feather" className="size-4" /> {t('Give me a statement')}
            </button>
          </div>
        )}
      </Card>

      <div>
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          rows={8}
          lang="es"
          spellCheck={false}
          placeholder="Escribe aquí…"
          className={cx(inputCls, 'resize-y leading-relaxed')}
          aria-label={t('Your text')}
        />
        <div className="mt-1 flex justify-between text-sm text-stone-500 dark:text-stone-400">
          <span>{t(n === 1 ? '{n} sentence' : '{n} sentences', { n })}</span>
          <span>{t('Saved automatically')}</span>
        </div>
      </div>

      <SectionTitle
        right={
          <button type="button" onClick={otherWords} className="text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
            {t('Other words')}
          </button>
        }
      >
        {t('New words in a sentence · optional')}
      </SectionTitle>
      <Card className="space-y-3">
        {words.map((w, i) => (
          <label key={w.id} className="block">
            <span className="mb-1 block text-[15px]">
              <b lang="es">{w.es}</b> <span className="text-stone-500 dark:text-stone-400">· {w.gloss}</span>
            </span>
            <input
              value={w.sentence}
              onChange={(e) => onSentence(i, e.target.value)}
              lang="es"
              spellCheck={false}
              placeholder={t('One sentence with “{w}”', { w: w.es })}
              className={cx(inputCls, '!text-[15px]')}
            />
          </label>
        ))}
        {!words.length && <p className="text-sm text-stone-500">{t('Learn a few words in the vocabulary block first.')}</p>}
      </Card>

      <Button size="lg" icon="copy" onClick={copy} disabled={!hasSomething}>
        {t('Copy correction prompt')}
      </Button>
      {copied === 'ok' && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          {t('Copied. Paste it into any AI chat (Claude, ChatGPT…), then paste the reply below.')}{' '}
          {t('It asks for overall feedback and only real mistakes — accents, capitals, punctuation and Spain-vs-Mexico differences don’t count.')}
        </p>
      )}
      {copied === 'fail' && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          {t('Your browser blocked copying. Long-press to copy the text manually.')}
        </p>
      )}

      <SectionTitle>{t('Feedback & corrections')}</SectionTitle>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={4}
        placeholder={t('Paste the AI reply here (the whole reply, or just the JSON block)')}
        className={cx(inputCls, 'resize-y text-[15px]')}
        aria-label={t('AI reply')}
      />
      <Button variant="secondary" className="w-full" onClick={read} disabled={!reply.trim()}>
        {t('Read feedback')}
      </Button>
      {problem && <p className="text-sm text-stone-600 dark:text-stone-300">{problem}</p>}

      {feedback && (feedback.summary || feedback.focus?.length) && (
        <Card className="space-y-2 border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30">
          {feedback.summary && <p className="text-[15px]">{feedback.summary}</p>}
          {!!feedback.focus?.length && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('Focus for next time')}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px]">
                {feedback.focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {parsed && (
        <Card className="space-y-3">
          {parsed.errors.length === 0 ? (
            <p className="text-[15px]">{t('No real mistakes — nice work!')}</p>
          ) : (
            <>
              <p className="text-sm text-stone-500 dark:text-stone-400">{t('Real mistakes become review cards. Untick any you don’t want.')}</p>
              {parsed.errors.map((e, i) => (
                <label key={i} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={e.on}
                    onChange={() => setParsed((p) => p && { ...p, errors: p.errors.map((x, k) => (k === i ? { ...x, on: !x.on } : x)) })}
                    className="mt-1 size-5 shrink-0 accent-emerald-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] text-rose-700 line-through decoration-rose-300 dark:text-rose-400" lang="es">
                      {e.original}
                    </span>
                    <span className="block text-[15px] font-medium text-emerald-700 dark:text-emerald-400" lang="es">
                      {e.correction}
                    </span>
                    {e.explanation && <span className="block text-sm text-stone-600 dark:text-stone-300">{e.explanation}</span>}
                    {e.topic && <Chip className="mt-1">{t(topicShort(e.topic))}</Chip>}
                  </span>
                </label>
              ))}
              <Button className="w-full" icon="download" onClick={doImport} disabled={!parsed.errors.some((e) => e.on)}>
                {t('Add {n} to mistake log + review', { n: parsed.errors.filter((e) => e.on).length })}
              </Button>
            </>
          )}
          {parsed.dropped > 0 && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t('Skipped {n} accent / capital / punctuation remarks — those don’t count as mistakes.', { n: parsed.dropped })}
            </p>
          )}
        </Card>
      )}
      {imported !== null && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Icon name="check" className="size-4" />{' '}
          {t(imported === 1 ? '{n} review card created. It shows up from tomorrow.' : '{n} review cards created. They show up from tomorrow.', { n: imported })}
        </p>
      )}

      <Button size="lg" variant="success" icon="check" onClick={onFinish} disabled={!hasSomething}>
        {t('Finish block')}
      </Button>
    </div>
  )
}
