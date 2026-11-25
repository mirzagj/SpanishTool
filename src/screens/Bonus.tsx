import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Card, Chip, Empty, PageHeader, SectionTitle, Segmented, cx, inputCls } from '../components/ui'
import { fmtShort, weekStart } from '../lib/dates'
import { db, type LogEntry, type LogType } from '../lib/db'
import { go, useToday } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { AddWord } from './library/VocabList'

type BonusType = Exclude<LogType, 'call'>
const SUBS: Record<'listening' | 'reading', { id: string; label: string }[]> = {
  listening: [
    { id: 'podcast', label: 'Podcast' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'other', label: 'Other' },
  ],
  reading: [
    { id: 'article', label: 'Article' },
    { id: 'book', label: 'Book' },
    { id: 'other', label: 'Other' },
  ],
}

export function Bonus({ sub }: { sub?: string }) {
  const t = useT()
  const type: BonusType = sub === 'listening' || sub === 'reading' ? sub : 'series'
  const today = useToday()
  const logs = useLiveQuery(() => db.logs.where('type').equals(type).reverse().sortBy('ts'), [type])
  const week = weekStart(today)
  const weekMin = (logs ?? []).filter((l) => l.date >= week).reduce((a, l) => a + l.minutes, 0)

  return (
    <div>
      <button type="button" onClick={() => go('today')} className="mb-1 inline-flex items-center gap-1 pt-2 text-sm text-stone-500 dark:text-stone-400">
        <Icon name="left" className="size-4" /> {t('Today')}
      </button>
      <PageHeader title={t('Bonus practice')} sub={t("Outside the daily plan — it doesn't affect your green days.")} />
      <div className="mb-4">
        <Segmented
          value={type}
          onChange={(v) => go(`bonus/${v}`)}
          options={[
            { value: 'series', label: t('Series') },
            { value: 'listening', label: t('Listening') },
            { value: 'reading', label: t('Reading') },
          ]}
        />
      </div>
      {type === 'series' ? <SeriesForm logs={logs ?? []} /> : <SimpleForm type={type} />}
      <SectionTitle right={<span className="text-xs text-stone-500">{t('{n} min this week', { n: weekMin })}</span>}>{t('History')}</SectionTitle>
      {!logs?.length ? (
        <Empty>{t('Nothing logged yet.')}</Empty>
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {logs.slice(0, 60).map((l) => (
              <LogRow key={l.id} l={l} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function LogRow({ l }: { l: LogEntry }) {
  const t = useT()
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">
          {l.title}
          {l.type === 'series' && l.season ? <span className="font-normal text-stone-500"> · S{l.season}E{l.episode ?? '?'}</span> : null}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {fmtShort(l.date)}
          {l.sub ? ` · ${t(SUBS[l.type as 'listening' | 'reading']?.find((s) => s.id === l.sub)?.label ?? l.sub)}` : ''}
        </p>
      </div>
      <span className="text-sm text-stone-500 tabular-nums">{l.minutes} min</span>
      <button
        type="button"
        onClick={() => confirm(t('Delete this entry?')) && db.logs.delete(l.id!)}
        className="rounded p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
        aria-label={t('Delete')}
      >
        <Icon name="trash" className="size-4" />
      </button>
    </li>
  )
}

function SeriesForm({ logs }: { logs: LogEntry[] }) {
  const t = useT()
  const today = useToday()
  const last = logs[0]
  const [title, setTitle] = useState(last?.title ?? '')
  const [season, setSeason] = useState(String(last?.season ?? 1))
  const [episode, setEpisode] = useState(String((last?.episode ?? 0) + 1))
  const [minutes, setMinutes] = useState('45')
  const [saved, setSaved] = useState('')
  const [words, setWords] = useState(false)
  const titles = [...new Set(logs.map((l) => l.title))]

  const pickTitle = (v: string) => {
    setTitle(v)
    const prev = logs.find((l) => l.title === v)
    if (prev) {
      setSeason(String(prev.season ?? 1))
      setEpisode(String((prev.episode ?? 0) + 1))
    }
  }
  const save = async () => {
    await db.logs.add({ date: today, ts: Date.now(), type: 'series', title: title.trim(), season: Number(season) || undefined, episode: Number(episode) || undefined, minutes: Number(minutes) || 0 })
    setSaved(`${title.trim()} S${season}E${episode}`)
    setEpisode(String((Number(episode) || 0) + 1))
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <input list="series-titles" value={title} onChange={(e) => pickTitle(e.target.value)} placeholder={t('Series title')} className={inputCls} />
        <datalist id="series-titles">
          {titles.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-stone-500">
            {t('Season')}
            <input type="number" inputMode="numeric" min={1} value={season} onChange={(e) => setSeason(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs text-stone-500">
            {t('Episode')}
            <input type="number" inputMode="numeric" min={1} value={episode} onChange={(e) => setEpisode(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs text-stone-500">
            {t('Minutes')}
            <input type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
          </label>
        </div>
        <Button className="w-full" icon="tv" onClick={save} disabled={!title.trim()}>
          {t('Log episode')}
        </Button>
        {saved && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            ✓ {t('Logged')} {saved}
          </p>
        )}
      </Card>
      <button type="button" onClick={() => setWords((w) => !w)} className={cx('inline-flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300')}>
        <Icon name="plus" className="size-4" /> {t('Quick-add new words from this episode')}
      </button>
      {words && <AddWord source="series" onDone={() => undefined} />}
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {t('Words go straight into your review deck.')} <Chip>{t('Tip: Spain series → note vosotros / vale as “recognise only”.')}</Chip>
      </p>
    </div>
  )
}

function SimpleForm({ type }: { type: 'listening' | 'reading' }) {
  const t = useT()
  const today = useToday()
  const [sub, setSub] = useState(SUBS[type][0].id)
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('20')
  const [saved, setSaved] = useState(false)
  const save = async () => {
    await db.logs.add({ date: today, ts: Date.now(), type, sub, title: title.trim() || t(SUBS[type].find((s) => s.id === sub)!.label), minutes: Number(minutes) || 0 })
    setTitle('')
    setSaved(true)
  }
  return (
    <Card className="space-y-2">
      <Segmented value={sub} onChange={setSub} options={SUBS[type].map((s) => ({ value: s.id, label: t(s.label) }))} />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'listening' ? t('Podcast / channel / episode') : t('Article or book title')} className={inputCls} />
      <label className="flex items-center justify-between gap-3 text-[15px]">
        {t('Minutes')}
        <input type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={cx(inputCls, '!w-24 text-right')} />
      </label>
      <Button className="w-full" icon={type === 'listening' ? 'headphones' : 'reading'} onClick={save} disabled={!Number(minutes)}>
        {t('Log minutes')}
      </Button>
      {saved && <p className="text-sm text-emerald-700 dark:text-emerald-400">✓ {t('Logged')}</p>}
    </Card>
  )
}
