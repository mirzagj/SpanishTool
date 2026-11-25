import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { AudioPlayer, Recorder } from '../../components/Recorder'
import { Button, Card, Chip, SectionTitle, cx, inputCls } from '../../components/ui'
import { speakingPromptFor } from '../../data/prompts'
import { topicShort } from '../../data/topics'
import { fmtDuration } from '../../lib/dates'
import { db, type DayRecord, type Recording } from '../../lib/db'
import { addMistakeWithCard } from '../../lib/practice'
import { useT } from '../../lib/i18n'
import { useSettings } from '../../lib/settings'

export function Speaking({ day, onFinish }: { day: DayRecord; onFinish: () => void }) {
  return day.call ? <CallBlock day={day} onFinish={onFinish} /> : <SpeakingBlock day={day} onFinish={onFinish} />
}

function SpeakingBlock({ day, onFinish }: { day: DayRecord; onFinish: () => void }) {
  const s = useSettings()
  const t = useT()
  const prompt = speakingPromptFor(day.topic, day.date)
  const recs = useLiveQuery(() => db.recordings.where('date').equals(day.date).filter((r) => r.kind === 'speaking').reverse().sortBy('ts'), [day.date])

  const save = async (r: { blob: Blob; mime: string; duration: number; transcript?: string }) => {
    await db.recordings.add({ date: day.date, ts: Date.now(), kind: 'speaking', prompt: prompt.text, blob: r.blob, mime: r.mime, duration: r.duration, transcript: r.transcript, redo: false })
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex gap-2">
          <Chip tone="sky">{t(topicShort(day.topic))}</Chip>
          <Chip>{t('1–2 minutes')}</Chip>
        </div>
        <p className="text-[17px] leading-snug font-medium" lang="es">
          {prompt.text}
        </p>
        <p className="mt-3 mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('Try to use')}</p>
        <ul className="space-y-1">
          {prompt.targets.map((t) => (
            <li key={t} className="flex items-center gap-2 text-[15px]">
              <span className="size-1.5 rounded-full bg-sky-500" /> {t}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Recorder transcript={s.transcript} onSaved={save} label={recs?.length ? t('Record another take') : t('Tap to record')} />
      </Card>

      {!!recs?.length && (
        <>
          <SectionTitle>{t('Today’s takes')}</SectionTitle>
          <div className="space-y-3">
            {recs.map((r, i) => (
              <Take key={r.id} r={r} n={recs.length - i} day={day} />
            ))}
          </div>
        </>
      )}

      <Button size="lg" variant="success" icon="check" onClick={onFinish}>
        {t('Finish block')}
      </Button>
    </div>
  )
}

function Take({ r, n, day }: { r: Recording; n: number; day: DayRecord }) {
  const s = useSettings()
  const t = useT()
  const redos = useLiveQuery(() => db.recordings.where('parentId').equals(r.id!).toArray(), [r.id])
  const [said, setSaid] = useState('')
  const [better, setBetter] = useState('')
  const [added, setAdded] = useState(false)

  const toggleRedo = () => db.recordings.update(r.id!, { redo: !r.redo })
  const saveRedo = async (x: { blob: Blob; mime: string; duration: number; transcript?: string }) => {
    await db.recordings.add({ date: day.date, ts: Date.now(), kind: 'redo', prompt: better || said || r.prompt, blob: x.blob, mime: x.mime, duration: x.duration, transcript: x.transcript, redo: false, parentId: r.id })
  }
  const addToReview = async () => {
    await addMistakeWithCard({ source: 'speaking', wrong: said, correct: better, explain: t('From your speaking practice'), topic: day.topic, prompt: r.prompt }, day.date)
    await db.recordings.update(r.id!, { note: `${said} → ${better}` })
    setAdded(true)
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t('Take {n}', { n })}</span>
        <span className="text-stone-500 tabular-nums">{fmtDuration(r.duration)}</span>
      </div>
      <AudioPlayer blob={r.blob} />
      {r.transcript && (
        <p className="rounded-xl bg-stone-100 px-3 py-2 text-[15px] dark:bg-stone-800" lang="es">
          <span className="mr-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('es-MX transcript')}</span>
          {r.transcript}
        </p>
      )}
      <button
        type="button"
        onClick={toggleRedo}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
          r.redo ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
        )}
      >
        <Icon name="redo" className="size-4" /> {r.redo ? t('Marked: redo worst sentence') : t('Redo worst sentence')}
      </button>
      {r.redo && (
        <div className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
          <input value={said} onChange={(e) => setSaid(e.target.value)} placeholder={t('Worst sentence (what you said)')} className={inputCls} lang="es" />
          <input value={better} onChange={(e) => setBetter(e.target.value)} placeholder={t('Better version')} className={inputCls} lang="es" />
          <div className="flex items-center justify-between gap-3">
            <Recorder size="sm" transcript={s.transcript} onSaved={saveRedo} label={t('Record the better version')} />
            <Button variant="secondary" size="sm" onClick={addToReview} disabled={!said.trim() || !better.trim() || added}>
              {added ? t('Added ✓') : t('Add to review')}
            </Button>
          </div>
          {redos?.map((x) => (
            <div key={x.id} className="space-y-1">
              <p className="text-xs text-stone-500">{t('Redo')} · {fmtDuration(x.duration)}</p>
              <AudioPlayer blob={x.blob} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

interface Correction {
  said: string
  correct: string
  note: string
}

function CallBlock({ day, onFinish }: { day: DayRecord; onFinish: () => void }) {
  const t = useT()
  const prompt = speakingPromptFor(day.topic, day.date)
  const [running, setRunning] = useState(false)
  const [secs, setSecs] = useState(0)
  const [minutes, setMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Correction[]>([0, 1, 2].map(() => ({ said: '', correct: '', note: '' })))
  const [saved, setSaved] = useState<number | null>(null)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSecs((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const set = (i: number, k: keyof Correction, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const valid = rows.filter((r) => r.correct.trim())
  const mins = Number(minutes) || Math.max(1, Math.round(secs / 60))

  const save = async () => {
    setRunning(false)
    await db.logs.add({ date: day.date, ts: Date.now(), type: 'call', title: t('Call with Mexican friend'), minutes: mins, notes: notes.trim() || undefined })
    for (const r of valid) {
      await addMistakeWithCard({ source: 'call', wrong: r.said.trim(), correct: r.correct.trim(), explain: r.note.trim(), prompt: t('Call with friend') }, day.date)
    }
    setSaved(valid.length)
  }

  if (saved !== null) {
    return (
      <Card className="space-y-4 text-center">
        <p className="text-3xl">📞</p>
        <p className="text-[17px] font-medium">{t('Call saved · {n} min', { n: mins })}</p>
        <p className="text-[15px] text-stone-600 dark:text-stone-300">
          {saved ? t(saved === 1 ? '{n} correction added to your mistake log and review deck.' : '{n} corrections added to your mistake log and review deck.', { n: saved }) : t('No corrections this time.')}
        </p>
        <Button size="lg" variant="success" icon="check" onClick={onFinish}>
          {t('Finish block')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[17px] font-medium">{t('Weekly call with your Mexican friend')}</p>
        <p className="mt-1 text-[15px] text-stone-600 dark:text-stone-300">
          {t('Ask them to note 2–3 things you said wrong. Need a conversation starter?')}
        </p>
        <p className="mt-2 rounded-xl bg-stone-100 px-3 py-2 text-[15px] dark:bg-stone-800" lang="es">
          {prompt.text}
        </p>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-semibold tabular-nums">{fmtDuration(secs)}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">{t('Call timer')}</p>
        </div>
        <Button variant={running ? 'secondary' : 'primary'} icon={running ? 'pause' : 'phone'} onClick={() => setRunning((r) => !r)}>
          {running ? t('Pause') : secs ? t('Resume') : t('Start call')}
        </Button>
      </Card>

      <SectionTitle>{t('Corrections from your friend')}</SectionTitle>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <Card key={i} className="space-y-2 !p-3">
            <input value={r.said} onChange={(e) => set(i, 'said', e.target.value)} placeholder={`${i + 1}. ${t('What I said')}`} className={inputCls} lang="es" />
            <input value={r.correct} onChange={(e) => set(i, 'correct', e.target.value)} placeholder={t('How my friend said it')} className={inputCls} lang="es" />
            <input value={r.note} onChange={(e) => set(i, 'note', e.target.value)} placeholder={t('Note (optional)')} className={cx(inputCls, '!text-[15px]')} />
          </Card>
        ))}
        <button type="button" onClick={() => setRows((r) => [...r, { said: '', correct: '', note: '' }])} className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300">
          <Icon name="plus" className="size-4" /> {t('Another correction')}
        </button>
      </div>

      <SectionTitle>{t('Notes')}</SectionTitle>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t('What did you talk about? New words?')} className={cx(inputCls, 'resize-y')} />
      <label className="flex items-center justify-between gap-3 text-[15px]">
        {t('Minutes')}
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder={String(Math.max(1, Math.round(secs / 60)))}
          className={cx(inputCls, '!w-24 text-right')}
        />
      </label>
      <Button size="lg" icon="check" onClick={save}>
        {valid.length ? t(valid.length === 1 ? 'Save call + {n} correction' : 'Save call + {n} corrections', { n: valid.length }) : t('Save call')}
      </Button>
    </div>
  )
}
