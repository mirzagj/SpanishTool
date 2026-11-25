import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Card, Chip, PageHeader, cx } from '../components/ui'
import { topicName } from '../data/topics'
import { THEME_NAME } from '../data/vocab/themes'
import { blockMeta } from '../lib/blocks'
import { WEEKDAYS_SHORT, WEEKDAYS_SHORT_ES, fmtLong, monthGrid, monthName, parse } from '../lib/dates'
import { db, type DayRecord } from '../lib/db'
import { useToday } from '../lib/hooks'
import { dayStatus, minutesPractised, streaks, type DayStatus } from '../lib/plan'
import { useT } from '../lib/i18n'
import { DAY_TYPE_LABEL, useSettings } from '../lib/settings'

export const STATUS_CLS: Record<DayStatus, string> = {
  full: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
  light: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  partial: 'bg-amber-200 text-amber-900 dark:bg-amber-700/70 dark:text-amber-50',
  none: 'bg-stone-100 text-stone-500 dark:bg-stone-800/70 dark:text-stone-400',
}
const STATUS_LABEL: Record<DayStatus, string> = {
  full: 'All core blocks',
  light: 'Light day',
  partial: 'Partly done',
  none: 'Nothing',
}

export function Calendar() {
  const today = useToday()
  const t = useT()
  const { uiLang } = useSettings()
  const td = parse(today)
  const [ym, setYm] = useState({ y: td.getFullYear(), m: td.getMonth() })
  const [sel, setSel] = useState<string>(today)
  const days = useLiveQuery(() => db.days.toArray(), [])
  const byDate = useMemo(() => Object.fromEntries((days ?? []).map((d) => [d.date, d])) as Record<string, DayRecord>, [days])
  const grid = monthGrid(ym.y, ym.m)
  const st = streaks(days ?? [], today)
  const monthPrefix = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`
  const practisedThisMonth = (days ?? []).filter((d) => d.date.startsWith(monthPrefix) && dayStatus(d) !== 'none').length
  const completeThisMonth = (days ?? []).filter((d) => d.date.startsWith(monthPrefix) && ['full', 'light'].includes(dayStatus(d))).length

  const shift = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <div>
      <PageHeader title={t('Calendar')} />
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label={t('Current streak')} value={st.current} unit={t('days')} />
        <Stat label={t('Longest streak')} value={st.longest} unit={t('days')} />
        <Stat label={t('Practised this month')} value={practisedThisMonth} unit={t('{n} complete', { n: completeThisMonth })} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label={t('Previous month')}>
            <Icon name="left" />
          </button>
          <h2 className="text-[17px] font-semibold">
            {monthName(ym.m, uiLang)} {ym.y}
          </h2>
          <button type="button" onClick={() => shift(1)} className="rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label={t('Next month')}>
            <Icon name="right" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {(uiLang === 'es' ? WEEKDAYS_SHORT_ES : WEEKDAYS_SHORT).map((w) => (
            <div key={w} className="pb-1 text-xs font-medium text-stone-400">
              {w.slice(0, 2)}
            </div>
          ))}
          {grid.map(({ date, inMonth }) => {
            const s = dayStatus(byDate[date])
            const future = date > today
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSel(date)}
                aria-label={`${fmtLong(date, uiLang)}: ${t(STATUS_LABEL[s])}`}
                className={cx(
                  'aspect-square rounded-lg text-sm font-medium tabular-nums transition-transform',
                  STATUS_CLS[s],
                  !inMonth && 'opacity-30',
                  future && s === 'none' && 'bg-transparent dark:bg-transparent',
                  date === today && 'ring-2 ring-stone-900 ring-offset-1 dark:ring-stone-100 dark:ring-offset-stone-900',
                  date === sel && date !== today && 'ring-2 ring-stone-400 ring-offset-1 dark:ring-offset-stone-900',
                )}
              >
                {parse(date).getDate()}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
          {(['full', 'light', 'partial', 'none'] as DayStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cx('size-3 rounded', STATUS_CLS[s])} /> {t(STATUS_LABEL[s])}
            </span>
          ))}
        </div>
      </Card>

      <DayDetail date={sel} day={byDate[sel]} />
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <Card className="!p-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs leading-tight text-stone-500 dark:text-stone-400">
        {label}
        <br />
        {unit}
      </div>
    </Card>
  )
}

function DayDetail({ date, day }: { date: string; day?: DayRecord }) {
  const t = useT()
  const { uiLang } = useSettings()
  const attempts = useLiveQuery(() => db.attempts.where('date').equals(date).toArray(), [date])
  const mistakes = useLiveQuery(() => db.mistakes.where('date').equals(date).count(), [date])
  const logs = useLiveQuery(() => db.logs.where('date').equals(date).toArray(), [date])
  const recs = useLiveQuery(() => db.recordings.where('date').equals(date).count(), [date])
  const writings = useLiveQuery(() => db.writings.where('date').equals(date).count(), [date])
  const status = dayStatus(day)
  const right = (attempts ?? []).filter((a) => a.correct).length

  return (
    <Card className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{fmtLong(date, uiLang)}</h3>
        <span className={cx('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_CLS[status])}>{t(STATUS_LABEL[status])}</span>
      </div>
      {!day ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">{t('No practice recorded.')}</p>
      ) : (
        <div className="space-y-3 text-[15px]">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Chip>{t(DAY_TYPE_LABEL[day.dayType])}</Chip>
            <span>{t(topicName(day.topic))}</span>
          </div>
          <ul className="space-y-1">
            {day.blocks.map((b) => (
              <li key={b.kind} className="flex items-center gap-2">
                <Icon name={b.done ? 'check' : 'x'} className={cx('size-4', b.done ? 'text-emerald-600' : 'text-stone-300 dark:text-stone-600')} strokeWidth={3} />
                <span className={cx(!b.done && 'text-stone-400 dark:text-stone-500')}>{blockMeta(b.kind, day, undefined, t).title}</span>
                {b.kind === 'vocab' && <span className="text-sm text-stone-400">· {t(THEME_NAME[day.theme])}</span>}
                <span className="ml-auto text-sm text-stone-500 tabular-nums dark:text-stone-400">
                  {b.seconds >= 60 ? `${Math.round(b.seconds / 60)} min` : b.done ? `${b.minutes} min` : ''}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-300">
            <Chip>{t('{n} min practised', { n: Math.round(minutesPractised(day)) })}</Chip>
            {!!attempts?.length && (
              <Chip>{t('{a}/{b} answers right', { a: right, b: attempts.length })}</Chip>
            )}
            {!!mistakes && <Chip tone="rose">{t('{n} mistakes logged', { n: mistakes })}</Chip>}
            {!!writings && <Chip>{t('Text written')}</Chip>}
            {!!recs && <Chip>{t('{n} recordings', { n: recs })}</Chip>}
          </div>
        </div>
      )}
      {!!logs?.length && (
        <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm dark:border-stone-800">
          {logs.map((l) => (
            <li key={l.id} className="flex justify-between gap-2">
              <span>
                {l.type === 'series' ? '📺' : l.type === 'listening' ? '🎧' : l.type === 'reading' ? '📖' : '📞'} {l.title}
                {l.type === 'series' && l.season ? ` · S${l.season}E${l.episode ?? '?'}` : ''}
              </span>
              <span className="text-stone-500 tabular-nums">{l.minutes} min</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
