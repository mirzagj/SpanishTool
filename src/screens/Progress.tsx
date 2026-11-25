import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { FocusCard, MissedWords, MistakeTypes, TopicLevels } from '../components/Analysis'
import { DataTable, Legend, LineChart, SERIES, SegmentBar, StackedColumns } from '../components/charts'
import { Card, PageHeader, SectionTitle } from '../components/ui'
import { topicShort } from '../data/topics'
import { VOCAB } from '../data/vocab'
import { analyse } from '../lib/analysis'
import { addDays, fmtShort } from '../lib/dates'
import { db, scoreOf } from '../lib/db'
import { useToday } from '../lib/hooks'
import { dayStatus, streaks } from '../lib/plan'
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
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), [])
  const analysis = useMemo(() => {
    const since = addDays(today, -60)
    return analyse((attempts ?? []).filter((a) => a.date >= since), mistakes ?? [])
  }, [attempts, mistakes, today])
  const shown = analysis.focus.slice(0, 2).map((f) => f.topic)

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
  const overallAcc = graded.length ? Math.round((graded.reduce((s, a) => s + scoreOf(a), 0) / graded.length) * 100) : null

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

      <SectionTitle>{t('What to work on next')}</SectionTitle>
      <FocusCard a={analysis} />

      <SectionTitle>{t('Your level per topic')}</SectionTitle>
      <TopicLevels a={analysis} />

      <SectionTitle>{t('Your most common mistakes · last 60 days')}</SectionTitle>
      <MistakeTypes categories={analysis.categories} />

      <SectionTitle>{t('Words you keep missing')}</SectionTitle>
      <MissedWords a={analysis} />

      <SectionTitle>{t('Accuracy over time')}</SectionTitle>
      <Card>
        <Legend items={lineSeries.map((l) => ({ label: l.label, color: l.color, line: true }))} />
        <LineChart labels={wLabels} series={lineSeries} />
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t('Weekly share of correct answers in drills and review, with your two focus topics.')}</p>
        <DataTable head={[t('Week'), ...lineSeries.map((l) => l.label)]} rows={wLabels.map((w, i) => [w, ...lineSeries.map((l) => (l.values[i] === null ? '—' : `${l.values[i]}%`))])} />
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
