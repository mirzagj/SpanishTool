import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Icon } from '../components/Icon'
import { Card, Checkbox, Chip, ProgressBar, SectionTitle, Toggle, cx } from '../components/ui'
import { topicName } from '../data/topics'
import { blockMeta } from '../lib/blocks'
import { fmtLong } from '../lib/dates'
import { LIGHT_BLOCKS, db } from '../lib/db'
import { go, useToday } from '../lib/hooks'
import { activeBlocks, dayStatus, ensureDay, setBlockDone, setLight, streaks } from '../lib/plan'
import { DAY_TYPE_LABEL } from '../lib/settings'

export function Today() {
  const today = useToday()
  useEffect(() => {
    void ensureDay(today)
  }, [today])
  const day = useLiveQuery(() => db.days.get(today), [today])
  const allDays = useLiveQuery(() => db.days.toArray(), [])
  const due = useLiveQuery(() => db.cards.where('due').belowOrEqual(today).count(), [today])
  const bonus = useLiveQuery(() => db.logs.where('date').equals(today).toArray(), [today])

  if (!day) return <div className="h-40" />

  const blocks = activeBlocks(day)
  const total = blocks.reduce((a, b) => a + b.minutes, 0)
  const doneMin = blocks.filter((b) => b.done).reduce((a, b) => a + b.minutes, 0)
  const status = dayStatus(day)
  const streak = allDays ? streaks(allDays, today).current : 0
  const bonusMin = (bonus ?? []).filter((l) => l.type !== 'call').reduce((a, l) => a + l.minutes, 0)

  return (
    <div>
      <header className="mb-4 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400">{fmtLong(today)}</p>
            <h1 className="text-2xl font-semibold tracking-tight">Hoy</h1>
          </div>
          <div
            className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            title="Current streak"
          >
            <Icon name="flame" className="size-4" /> {streak}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone={day.dayType === 'topic' ? 'sky' : day.dayType === 'structure' ? 'amber' : 'stone'}>{DAY_TYPE_LABEL[day.dayType]}</Chip>
          <span className="text-[15px] font-medium">{topicName(day.topic)}</span>
          {day.pos && (
            <span className="text-sm text-stone-500 dark:text-stone-400">
              · day {day.pos.day} of {day.pos.of}
            </span>
          )}
        </div>
      </header>

      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[15px] font-medium">
            {status === 'full' ? '¡Día completo! 🎉' : status === 'light' && day.light ? 'Light day done ✓' : `${doneMin} of ${total} min`}
          </span>
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {blocks.filter((b) => b.done).length}/{blocks.length} blocks
          </span>
        </div>
        <ProgressBar value={total ? doneMin / total : 0} />
        <div className="mt-4 border-t border-stone-100 pt-3 dark:border-stone-800">
          <Toggle checked={day.light} onChange={(v) => setLight(today, v)} label="Light day" description="20-minute minimum: review + drills. Still counts (light green)." />
        </div>
      </Card>

      <SectionTitle>Today's plan · {total} min</SectionTitle>
      <ol className="space-y-2">
        {day.blocks.map((b, i) => {
          const skipped = day.light && !LIGHT_BLOCKS.includes(b.kind)
          if (skipped) return null
          const m = blockMeta(b.kind, day, due)
          return (
            <li key={b.kind}>
              <Card className={cx('flex items-center gap-3 !p-3', b.done && 'bg-stone-50 dark:bg-stone-900/60')}>
                <Checkbox checked={b.done} onChange={(v) => setBlockDone(today, b.kind, v)} label={`${m.title} done`} />
                <button type="button" onClick={() => go(`do/${b.kind}`)} className="min-w-0 flex-1 text-left">
                  <span className={cx('flex items-center gap-1.5 text-[15px] font-medium', b.done && 'text-stone-500 line-through decoration-stone-300 dark:decoration-stone-600')}>
                    <span className="text-xs text-stone-400 tabular-nums">{i + 1}</span>
                    {m.title}
                  </span>
                  <span className="block truncate text-sm text-stone-500 dark:text-stone-400">{m.sub}</span>
                </button>
                <span className="text-sm text-stone-500 tabular-nums dark:text-stone-400">{b.minutes}′</span>
                <button
                  type="button"
                  onClick={() => go(`do/${b.kind}`)}
                  aria-label={`Start ${m.title}`}
                  className={cx(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    b.done ? 'bg-stone-100 text-stone-500 dark:bg-stone-800' : 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900',
                  )}
                >
                  <Icon name={b.done ? 'redo' : 'play'} className="size-4" />
                </button>
              </Card>
            </li>
          )
        })}
      </ol>
      {day.light && <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Light day: vocabulary, writing and speaking are skipped today.</p>}

      <SectionTitle>Bonus · outside the 45 min</SectionTitle>
      <Card className="!p-3">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['series', 'tv', 'Series'],
              ['listening', 'headphones', 'Listening'],
              ['reading', 'reading', 'Reading'],
            ] as const
          ).map(([k, icon, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => go(`bonus/${k}`)}
              className="flex flex-col items-center gap-1 rounded-xl py-3 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <Icon name={icon} className="size-5 text-stone-500" />
              {label}
            </button>
          ))}
        </div>
        {bonusMin > 0 && <p className="mt-1 text-center text-sm text-stone-500 dark:text-stone-400">{bonusMin} bonus min logged today</p>}
      </Card>
    </div>
  )
}
