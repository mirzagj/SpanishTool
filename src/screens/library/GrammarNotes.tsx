import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../../components/Icon'
import { Button, Card, Chip, SectionTitle, cx } from '../../components/ui'
import { NOTE_BY_TOPIC } from '../../data/notes'
import { EXERCISES_BY_TOPIC } from '../../data/exercises'
import { TOPICS, TOPIC_BY_ID } from '../../data/topics'
import type { TopicId } from '../../data/types'
import { db } from '../../lib/db'
import { go } from '../../lib/hooks'
import { useT } from '../../lib/i18n'
import { topicAccuracy } from '../../lib/plan'
import { LevelChip, TopicResults } from '../../components/Analysis'
import { analyse } from '../../lib/analysis'
import { addDays, todayStr } from '../../lib/dates'
import { useMemo } from 'react'

export function AccuracyChip({ acc, n }: { acc?: number; n?: number }) {
  const t = useT()
  if (!n || acc === undefined) return <Chip>{t('no data')}</Chip>
  const pct = Math.round(acc * 100)
  return <Chip tone={pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'rose'}>{pct}%</Chip>
}

export function GrammarNotes({ topic }: { topic?: string }) {
  const t = useT()
  const attempts = useLiveQuery(() => db.attempts.where('date').aboveOrEqual(addDays(todayStr(), -60)).toArray(), [])
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), [])
  const acc = topicAccuracy(attempts ?? [])
  const analysis = useMemo(() => analyse(attempts ?? [], mistakes ?? []), [attempts, mistakes])
  const note = topic ? NOTE_BY_TOPIC[topic as TopicId] : undefined

  if (note) {
    const meta = TOPIC_BY_ID[note.topic]
    return (
      <div>
        <button type="button" onClick={() => go('library/grammar')} className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
          <Icon name="left" className="size-4" /> {t('All topics')}
        </button>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold">{t(meta.name)}</h2>
          <LevelChip level={analysis.topics.find((r) => r.topic === note.topic)!.level} />
        </div>
        <p className="text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">{note.summary}</p>

        <SectionTitle>{t('Your results')}</SectionTitle>
        <TopicResults r={analysis.topics.find((r) => r.topic === note.topic)!} />

        <SectionTitle>{t('Rules')}</SectionTitle>
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
            {note.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>

        <SectionTitle>{t('Dutch-speaker pitfalls')}</SectionTitle>
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
            {note.pitfalls.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>

        <SectionTitle>{t('Mexican examples')}</SectionTitle>
        <Card className="space-y-3">
          {note.examples.map((e) => (
            <div key={e.es}>
              <p className="text-[16px] font-medium" lang="es">
                {e.es}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">{e.en}</p>
            </div>
          ))}
        </Card>

        {note.spain && (
          <>
            <SectionTitle>{t('Spain · recognise only')}</SectionTitle>
            <Card className="border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30">
              <ul className="list-disc space-y-1.5 pl-5 text-[15px]" lang="es">
                {note.spain.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Card>
          </>
        )}
        <div className="mt-5">
          <Button size="lg" icon="edit" onClick={() => go(`practice/${note.topic}`)}>
            {t('Practise this topic')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="!p-0">
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {TOPICS.map((tp, i) => (
          <li key={tp.id}>
            <button type="button" onClick={() => go(`library/grammar/${tp.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50">
              <span className="w-5 text-right text-xs text-stone-400 tabular-nums">{i + 1}</span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{t(tp.name)}</span>
                <span className={cx('block text-xs text-stone-500 dark:text-stone-400')}>
                  {t('{n} exercises', { n: EXERCISES_BY_TOPIC[tp.id]?.length ?? 0 })}{tp.structure ? ` · ${t('structure')}` : ''}
                </span>
              </span>
              <AccuracyChip acc={acc[tp.id]?.acc} n={acc[tp.id]?.n} />
              <Icon name="right" className="size-4 text-stone-400" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
