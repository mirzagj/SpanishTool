import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { DataTable, Legend, LineChart, SERIES, SegmentBar, StackedColumns } from '../components/charts'
import { Card, Chip, PageHeader, SectionTitle, cx } from '../components/ui'
import { TOPICS, topicShort } from '../data/topics'
import type { TopicId } from '../data/types'
import { VOCAB } from '../data/vocab'
import { fmtShort } from '../lib/dates'
import { db } from '../lib/db'
import { go, useToday } from '../lib/hooks'
import { dayStatus, streaks, topicAccuracy } from '../lib/plan'
import { useT } from '../lib/i18n'
import { totalMinutes, useSettings } from '../lib/settings'
import { isMature } from '../lib/srs'
import { lastWeeks, minutesPerWeek, weeklyAccuracy } from '../lib/stats'

function Tile({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <Card className="!p-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs leading-tight text-stone-500 dark:text-stone-400">{label}</div>
      {sub && <div className="text-xs text-stone-400">{sub}</div>}
    </Card>
  )
}

export function Progress() {
  const today = useToday()
  const s = useSettings()
  const t = useT()
  const attempts = useLiveQuery(() => db.attempts.toArray(), [])
  const days = useLiveQuery(() => db.days.toArray(), [])
  const logs = useLiveQuery(() => db.logs.toArray(), [])
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const [picked, setPicked] = useState<TopicId[] | null>(null)

  const acc = useMemo(() => topicAccuracy(attempts ?? []), [attempts])
  const practised = TOPICS.filter((t) => (acc[t.id]?.n ?? 0) >= 4)
  // the (up to) three lowest topics, and only when they are actually below 85%
  const weakest = [...practised].sort((a, b) => acc[a.id].acc - acc[b.id].acc).filter((t) => acc[t.id].acc < 0.85).slice(0, 3)
  const weakIds = new Set(weakest.map((t) => t.id))
  const shown: TopicId[] = picked ?? weakest.slice(0, 2).map((t) => t.id)

  if (!attempts || !days || !logs || !cards) return null

  const weeks = lastWeeks(today, 10)
  const wLabels = weeks.map((w) => fmtShort(w, s.uiLang))
  const overall = weeklyAccuracy(attempts, weeks)
  const lineSeries = [
    { label: t('All topics'), color: SERIES[0], values: overall },
    ...shown.map((tp, i) => ({ label: t(topicShort(tp)), color: SERIES[i + 1], values: weeklyAccuracy(attempts, weeks, tp) })),
  ]
  const mins = minutesPerWeek(days, logs, lastWeeks(today, 8))
  const minWeeks = lastWeeks(today, 8).map((w) => fmtShort(w, s.uiLang))

  const vocabCards = cards.filter((c) => c.kind === 'vocab' || (c.kind === 'custom' && c.theme === 'custom'))
  const mature = vocabCards.filter(isMature).length
  const learning = vocabCards.length - mature
  const notYet = Math.max(0, VOCAB.length - cards.filter((c) => c.kind === 'vocab').length)

  const st = streaks(days, today)
  const daysPractised = days.filter((d) => dayStatus(d) !== 'none').length
  const series = logs.filter((l) => l.type === 'series')
  const calls = logs.filter((l) => l.type === 'call')
  const listenMin = logs.filter((l) => l.type === 'listening').reduce((a, l) => a + l.minutes, 0)
  const readMin = logs.filter((l) => l.type === 'reading').reduce((a, l) => a + l.minutes, 0)
  const graded = attempts.filter((a) => a.source !== 'vocab')
  const overallAcc = graded.length ? Math.round((graded.filter((a) => a.correct).length / graded.length) * 100) : null

  const toggle = (tp: TopicId) => {
    const cur = shown
    const next = cur.includes(tp) ? cur.filter((x) => x !== tp) : [...cur, tp].slice(-2)
    setPicked(next)
  }

  return (
    <div>
      <PageHeader title={t('Progress')} sub={t('Goal: solid B2 in speaking, writing, reading and listening')} />
      <div className="grid grid-cols-3 gap-2">
        <Tile value={daysPractised} label={t('days practised')} sub={t('streak {a} · best {b}', { a: st.current, b: st.longest })} />
        <Tile value={overallAcc === null ? '—' : `${overallAcc}%`} label={t('grammar accuracy')} sub={t('{n} answers', { n: graded.length })} />
        <Tile value={vocabCards.length} label={t('words learned')} sub={t('{n} mature', { n: mature })} />
        <Tile value={calls.length} label={t('friend calls')} />
        <Tile value={series.length} label={t('episodes watched')} sub={`${series.reduce((a, l) => a + l.minutes, 0)} min`} />
        <Tile value={listenMin + readMin} label={t('bonus min')} sub={`🎧 ${listenMin} · 📖 ${readMin}`} />
      </div>

      <SectionTitle>{t('Accuracy over time')}</SectionTitle>
      <Card>
        <Legend items={lineSeries.map((l) => ({ label: l.label, color: l.color, line: true }))} />
        <LineChart labels={wLabels} series={lineSeries} />
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t('Weekly share of correct answers in drills and review. Tap topics below to compare (max 2).')}</p>
        <DataTable head={[t('Week'), ...lineSeries.map((l) => l.label)]} rows={wLabels.map((w, i) => [w, ...lineSeries.map((l) => (l.values[i] === null ? '—' : `${l.values[i]}%`))])} />
      </Card>

      <SectionTitle>{t('By topic · last 30 answers')}</SectionTitle>
      <Card className="!p-2">
        <ul>
          {TOPICS.map((tp) => {
            const a = acc[tp.id]
            const pct = a && a.n ? Math.round(a.acc * 100) : null
            const on = shown.includes(tp.id)
            return (
              <li key={tp.id}>
                <button
                  type="button"
                  onClick={() => (pct === null ? go(`library/grammar/${tp.id}`) : toggle(tp.id))}
                  className={cx('flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left', on && 'bg-stone-100 dark:bg-stone-800')}
                >
                  <span className="w-32 shrink-0 truncate text-sm">{t(tp.short)}</span>
                  <span className="relative h-3 flex-1">
                    {pct !== null && (
                      <span
                        className="absolute inset-y-0 left-0 rounded-r"
                        style={{ width: `${Math.max(2, pct)}%`, background: on ? SERIES[shown.indexOf(tp.id) + 1] : 'var(--series-1)', opacity: on ? 1 : 0.55 }}
                      />
                    )}
                  </span>
                  <span className="w-12 text-right text-sm tabular-nums">{pct === null ? <span className="text-stone-400">—</span> : `${pct}%`}</span>
                  {weakIds.has(tp.id) ? <Chip tone="rose">{t('weak')}</Chip> : <span className="w-[42px]" />}
                </button>
              </li>
            )
          })}
        </ul>
        {weakest.length > 0 && (
          <p className="px-2 pt-1 pb-1 text-xs text-stone-500 dark:text-stone-400">{t('Weak topics automatically get more drills on mixed and topic days.')}</p>
        )}
      </Card>

      <SectionTitle>{t('Minutes per week')}</SectionTitle>
      <Card>
        <Legend
          items={[
            { label: t('Core practice'), color: SERIES[0] },
            { label: t('Bonus (series, listening, reading)'), color: SERIES[1] },
          ]}
        />
        <StackedColumns
          labels={minWeeks}
          target={totalMinutes(s) * 7}
          series={[
            { label: t('Core'), color: SERIES[0], values: mins.core },
            { label: t('Bonus'), color: SERIES[1], values: mins.bonus },
          ]}
        />
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t('The grey line is your full weekly budget ({n} min).', { n: totalMinutes(s) * 7 })}</p>
        <DataTable head={[t('Week'), t('Core min'), t('Bonus min')]} rows={minWeeks.map((w, i) => [w, mins.core[i], mins.bonus[i]])} />
      </Card>

      <SectionTitle>{t('Vocabulary')}</SectionTitle>
      <Card>
        <SegmentBar
          parts={[
            { label: t('Mature (21+ days)'), value: mature, color: SERIES[2] },
            { label: t('Learning'), value: learning, color: SERIES[0] },
            { label: t('Not started'), value: notYet, color: 'var(--grid-strong)' },
          ]}
        />
      </Card>
    </div>
  )
}
