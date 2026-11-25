import { topicName, topicShort } from '../data/topics'
import { CATEGORY_HINT, CATEGORY_LABEL, LEVEL_LABEL, type Analysis, type CategoryReport, type Level, type TopicReport, type Trend } from '../lib/analysis'
import { go } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { useSettings } from '../lib/settings'
import { Icon } from './Icon'
import { Button, Card, Chip, Empty, cx } from './ui'

const LEVEL_TONE: Record<Level, 'stone' | 'rose' | 'amber' | 'sky' | 'green'> = {
  none: 'stone',
  'needs-work': 'rose',
  building: 'amber',
  good: 'sky',
  strong: 'green',
}

export function LevelChip({ level }: { level: Level }) {
  const t = useT()
  return <Chip tone={LEVEL_TONE[level]}>{t(LEVEL_LABEL[level])}</Chip>
}

export function TrendMark({ trend }: { trend: Trend }) {
  const t = useT()
  if (!trend) return null
  const map = {
    up: { s: '↑', c: 'text-emerald-600', l: 'improving' },
    down: { s: '↓', c: 'text-rose-600', l: 'getting worse' },
    flat: { s: '→', c: 'text-stone-400', l: 'steady' },
  }[trend]
  return (
    <span className={cx('text-sm font-semibold', map.c)} title={t(map.l)} aria-label={t(map.l)}>
      {map.s}
    </span>
  )
}

/** "What to work on next": the weakest topics, why, and a button to practise each. */
export function FocusCard({ a }: { a: Analysis }) {
  const t = useT()
  const practised = a.topics.filter((x) => x.level !== 'none')
  if (!practised.length) {
    return (
      <Card>
        <p className="text-[15px] text-stone-600 dark:text-stone-300">{t('Do a few drill sessions and your personal analysis appears here: your level per topic, your typical mistakes and what to practise next.')}</p>
      </Card>
    )
  }
  if (!a.focus.length) {
    return (
      <Card>
        <p className="text-[15px] text-stone-600 dark:text-stone-300">{t('Everything you have practised is at 85% or higher. Keep going — new topics come with the curriculum.')}</p>
      </Card>
    )
  }
  const topCat = (r: TopicReport) => r.categories.find((c) => c.category !== 'spelling' && c.category !== 'accent')
  return (
    <Card className="space-y-3">
      {a.focus.map((r) => {
        const cat = topCat(r)
        return (
          <div key={r.topic} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                {t(topicName(r.topic))} <LevelChip level={r.level} /> <TrendMark trend={r.trend} />
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {t('{p}% in your last {n} answers', { p: Math.round(r.acc * 100), n: r.n })}
                {cat ? ` · ${t('mostly: {c}', { c: t(CATEGORY_LABEL[cat.category]).toLowerCase() })}` : ''}
              </p>
            </div>
            <Button size="sm" variant="secondary" icon="edit" onClick={() => go(`practice/${r.topic}`)}>
              {t('Practise')}
            </Button>
          </div>
        )
      })}
    </Card>
  )
}

/** Level, accuracy and trend for every topic; tap a topic for its details. */
export function TopicLevels({ a }: { a: Analysis }) {
  const t = useT()
  return (
    <Card className="!p-2">
      <ul>
        {a.topics.map((r) => (
          <li key={r.topic}>
            <button
              type="button"
              onClick={() => go(`library/grammar/${r.topic}`)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800/60"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{t(topicShort(r.topic))}</span>
              {r.level === 'none' ? (
                <span className="text-xs text-stone-400">{r.n ? t('{n} answers so far', { n: r.n }) : '—'}</span>
              ) : (
                <>
                  <TrendMark trend={r.trend} />
                  <span className="w-10 text-right text-sm tabular-nums">{Math.round(r.acc * 100)}%</span>
                  <LevelChip level={r.level} />
                </>
              )}
              <Icon name="right" className="size-4 shrink-0 text-stone-300" />
            </button>
          </li>
        ))}
      </ul>
      <p className="px-2 pt-1 pb-1 text-xs text-stone-500 dark:text-stone-400">
        {t('Level = your last 30 answers per topic (almost-right counts as half). Needs work < 50% · Building < 70% · Good < 85% · Strong.')}
      </p>
    </Card>
  )
}

export function MistakeTypes({ categories, limit = 6, bare = false }: { categories: CategoryReport[]; limit?: number; bare?: boolean }) {
  const t = useT()
  if (!categories.length) return <Empty>{t('No mistakes to analyse yet.')}</Empty>
  const max = categories[0].count
  const Wrap = bare ? 'div' : Card
  return (
    <Wrap className="space-y-3">
      {categories.slice(0, limit).map((c) => (
        <details key={c.category} className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-medium">{t(CATEGORY_LABEL[c.category])}</span>
              <span className="text-sm text-stone-500 tabular-nums">{c.count}×</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
              <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: 'var(--series-1)' }} />
            </div>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {t(CATEGORY_HINT[c.category])} · <span className="underline decoration-dotted group-open:hidden">{t('show examples')}</span>
            </p>
          </summary>
          <ul className="mt-2 space-y-1.5 border-l-2 border-stone-200 pl-3 dark:border-stone-700">
            {c.examples.map((e, i) => (
              <li key={i} className="text-sm" lang="es">
                <span className="text-rose-700 line-through decoration-rose-300 dark:text-rose-400">{e.you || '—'}</span>
                {' → '}
                <span className="font-medium text-emerald-700 dark:text-emerald-400">{e.correct}</span>
                {e.topic && <span className="ml-1 text-xs text-stone-400">· {t(topicShort(e.topic))}</span>}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </Wrap>
  )
}

export function MissedWords({ a }: { a: Analysis }) {
  const t = useT()
  const s = useSettings()
  if (!a.missedWords.length) return <Empty>{t('No vocabulary misses yet.')}</Empty>
  return (
    <Card className="!p-0">
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {a.missedWords.map((w) => (
          <li key={w.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <span>
              <span className="font-medium" lang="es">
                {w.es}
              </span>
              <span className="ml-2 text-sm text-stone-500 dark:text-stone-400">{s.promptLang === 'nl' ? w.nl : w.en}</span>
            </span>
            <span className="text-sm text-stone-500 tabular-nums">{t('missed {n}×', { n: w.misses })}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Analysis for one topic (shown on the grammar note page). */
export function TopicResults({ r }: { r: TopicReport }) {
  const t = useT()
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <LevelChip level={r.level} />
        {r.level !== 'none' && (
          <span className="text-[15px]">
            {t('{p}% in your last {n} answers', { p: Math.round(r.acc * 100), n: r.n })} <TrendMark trend={r.trend} />
          </span>
        )}
        {r.level === 'none' && <span className="text-sm text-stone-500">{t('Answer at least 5 questions on this topic to see your level.')}</span>}
      </div>
      {r.external > 0 && (
        <p className="text-sm text-stone-600 dark:text-stone-300">{t('Plus {n} corrections from your writing, calls or speaking on this topic (see Library → Mistakes).', { n: r.external })}</p>
      )}
      {r.categories.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('Your typical mistakes here')}</p>
          <MistakeTypes categories={r.categories} limit={4} bare />
        </div>
      )}
    </Card>
  )
}
