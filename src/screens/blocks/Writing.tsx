import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, Card, Chip, SectionTitle, cx, inputCls } from '../../components/ui'
import { writingPromptFor } from '../../data/prompts'
import { topicName, topicShort } from '../../data/topics'
import { copyText } from '../../lib/clipboard'
import { buildCorrectionPrompt, countSentences, parseCorrections, type ImportedError } from '../../lib/correction'
import { db, type DayRecord } from '../../lib/db'
import { addMistakeWithCard } from '../../lib/practice'
import { useSettings } from '../../lib/settings'

export function Writing({ day, onFinish }: { day: DayRecord; onFinish: () => void }) {
  const s = useSettings()
  const prompt = writingPromptFor(day.topic, day.date)
  // null = loaded, no draft yet (undefined means still loading)
  const existing = useLiveQuery(() => db.writings.where('date').equals(day.date).first().then((r) => r ?? null), [day.date])
  const [text, setText] = useState<string | null>(null)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const [reply, setReply] = useState('')
  const [parsed, setParsed] = useState<(ImportedError & { on: boolean })[] | null>(null)
  const [problem, setProblem] = useState('')
  const [imported, setImported] = useState<number | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  // load the draft once
  useEffect(() => {
    if (text === null && existing !== undefined) setText(existing?.text ?? '')
  }, [existing, text])

  const save = async (value: string) => {
    const row = await db.writings.where('date').equals(day.date).first()
    if (row) await db.writings.update(row.id!, { text: value, ts: Date.now() })
    else await db.writings.add({ date: day.date, ts: Date.now(), topic: day.topic, prompt: prompt.text, text: value, imported: 0 })
  }
  const onChange = (v: string) => {
    setText(v)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void save(v), 600)
  }

  if (text === null) return null
  const n = countSentences(text)

  const copy = async () => {
    await save(text)
    const ok = await copyText(buildCorrectionPrompt({ task: prompt.text, target: `${topicName(day.topic)} — ${prompt.target}`, text, lang: s.promptLang }))
    setCopied(ok ? 'ok' : 'fail')
  }

  const read = () => {
    const r = parseCorrections(reply)
    setProblem(r.problem ?? (r.errors.length ? '' : 'No errors in the list — nice work! Nothing to import.'))
    setParsed(r.errors.map((e) => ({ ...e, topic: e.topic ?? day.topic, on: true })))
    setImported(null)
  }

  const doImport = async () => {
    const chosen = (parsed ?? []).filter((e) => e.on)
    for (const e of chosen) {
      await addMistakeWithCard({ source: 'writing', wrong: e.original, correct: e.correction, explain: e.explanation, topic: e.topic, prompt: prompt.text }, day.date)
    }
    const row = await db.writings.where('date').equals(day.date).first()
    if (row) await db.writings.update(row.id!, { imported: (row.imported ?? 0) + chosen.length })
    setImported(chosen.length)
    setParsed(null)
    setReply('')
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex flex-wrap gap-2">
          <Chip tone="sky">{topicShort(day.topic)}</Chip>
          <Chip>4–6 sentences</Chip>
        </div>
        <p className="text-[17px] leading-snug font-medium" lang="es">
          {prompt.text}
        </p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Use: {prompt.target}</p>
      </Card>

      <div>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          lang="es"
          spellCheck={false}
          placeholder="Escribe tu texto aquí…"
          className={cx(inputCls, 'resize-y leading-relaxed')}
          aria-label="Your text"
        />
        <div className="mt-1 flex justify-between text-sm text-stone-500 dark:text-stone-400">
          <span className={cx(n >= 4 && n <= 6 && 'font-medium text-emerald-600')}>
            {n} sentence{n === 1 ? '' : 's'}
          </span>
          <span>Saved automatically</span>
        </div>
      </div>

      <Button size="lg" icon="copy" onClick={copy} disabled={n < 1}>
        Copy correction prompt
      </Button>
      {copied === 'ok' && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          Copied. Paste it into any AI chat (Claude, ChatGPT…), then paste the reply below.
        </p>
      )}
      {copied === 'fail' && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          Your browser blocked copying. Long-press to copy the text manually.
        </p>
      )}

      <SectionTitle>Import the corrections</SectionTitle>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={4}
        placeholder="Paste the AI reply here (the whole reply, or just the JSON block)"
        className={cx(inputCls, 'resize-y text-[15px]')}
        aria-label="AI reply"
      />
      <Button variant="secondary" className="w-full" onClick={read} disabled={!reply.trim()}>
        Read errors
      </Button>
      {problem && <p className="text-sm text-stone-600 dark:text-stone-300">{problem}</p>}

      {parsed && parsed.length > 0 && (
        <Card className="space-y-3">
          <p className="text-sm text-stone-500 dark:text-stone-400">Untick anything you don’t want as a review card.</p>
          {parsed.map((e, i) => (
            <label key={i} className="flex gap-3">
              <input
                type="checkbox"
                checked={e.on}
                onChange={() => setParsed((p) => p!.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))}
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
                {e.topic && <Chip className="mt-1">{topicShort(e.topic)}</Chip>}
              </span>
            </label>
          ))}
          <Button className="w-full" icon="download" onClick={doImport} disabled={!parsed.some((e) => e.on)}>
            Add {parsed.filter((e) => e.on).length} to mistake log + review
          </Button>
        </Card>
      )}
      {imported !== null && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Icon name="check" className="size-4" /> {imported} review card{imported === 1 ? '' : 's'} created. They show up from tomorrow.
        </p>
      )}

      <Button size="lg" variant="success" icon="check" onClick={onFinish} disabled={n < 1}>
        Finish block
      </Button>
    </div>
  )
}
