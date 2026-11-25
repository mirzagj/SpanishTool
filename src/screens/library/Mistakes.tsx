import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, Card, Chip, Empty, cx, inputCls } from '../../components/ui'
import { TOPICS, topicShort } from '../../data/topics'
import type { TopicId } from '../../data/types'
import { fmtShort } from '../../lib/dates'
import { db, type Mistake, type MistakeSource } from '../../lib/db'
import { useToday } from '../../lib/hooks'
import { useT } from '../../lib/i18n'
import { addMistakeWithCard } from '../../lib/practice'
import { useSettings } from '../../lib/settings'

const SOURCES: { id: MistakeSource | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'drill', label: 'Drills' },
  { id: 'writing', label: 'Writing' },
  { id: 'call', label: 'Calls' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'manual', label: 'Added' },
]

export function Mistakes() {
  const t = useT()
  const [src, setSrc] = useState<MistakeSource | 'all'>('all')
  const [topic, setTopic] = useState<TopicId | ''>('')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const list = useLiveQuery(() => db.mistakes.orderBy('id').reverse().toArray(), [])

  const filtered = (list ?? []).filter(
    (m) =>
      (src === 'all' || m.source === src) &&
      (!topic || m.topic === topic) &&
      (!q || `${m.prompt} ${m.wrong} ${m.correct} ${m.explain}`.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search')} className={cx(inputCls, '!py-2 pl-9 !text-[15px]')} />
        </div>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value as TopicId | '')}
          className={cx(inputCls, '!w-auto !py-2 !text-[15px]')}
          aria-label={t('Filter by topic')}
        >
          <option value="">{t('All topics')}</option>
          {TOPICS.map((tp) => (
            <option key={tp.id} value={tp.id}>
              {t(tp.short)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSrc(s.id)}
            className={cx(
              'rounded-full px-3 py-1 text-sm font-medium',
              src === s.id ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
            )}
          >
            {t(s.label)}
          </button>
        ))}
        <button type="button" onClick={() => setAdding((a) => !a)} className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300">
          <Icon name="plus" className="size-4" /> {t('Add')}
        </button>
      </div>
      {adding && <AddMistake onDone={() => setAdding(false)} />}
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {t(filtered.length === 1 ? '{n} mistake · each one is a review card' : '{n} mistakes · each one is a review card', { n: filtered.length })}
      </p>
      {!filtered.length ? (
        <Empty>{t('No mistakes here yet. They appear automatically from drills, writing corrections and calls.')}</Empty>
      ) : (
        <ul className="space-y-2">
          {filtered.slice(0, 300).map((m) => (
            <MistakeRow key={m.id} m={m} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MistakeRow({ m }: { m: Mistake }) {
  const t = useT()
  const { uiLang } = useSettings()
  const remove = async () => {
    if (!confirm(t('Delete this mistake and its review card?'))) return
    await db.transaction('rw', db.mistakes, db.cards, async () => {
      await db.mistakes.delete(m.id!)
      if (m.cardId?.startsWith('cu:')) await db.cards.delete(m.cardId)
    })
  }
  return (
    <li>
      <Card className="!p-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span>{fmtShort(m.date, uiLang)}</span>
          <Chip>{t(SOURCES.find((s) => s.id === m.source)?.label ?? m.source)}</Chip>
          {m.topic && <Chip tone="sky">{t(topicShort(m.topic))}</Chip>}
          {m.slip && <Chip tone="amber">{t('small slip')}</Chip>}
          <button type="button" onClick={remove} className="ml-auto rounded p-1 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label={t('Delete')}>
            <Icon name="trash" className="size-4" />
          </button>
        </div>
        {m.prompt && (
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400" lang="es">
            {m.prompt}
          </p>
        )}
        <p className="text-[15px] text-rose-700 line-through decoration-rose-300 dark:text-rose-400 dark:decoration-rose-800" lang="es">
          {m.wrong || '—'}
        </p>
        <p className="text-[15px] font-medium text-emerald-700 dark:text-emerald-400" lang="es">
          {m.correct}
        </p>
        {m.explain && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{m.explain}</p>}
      </Card>
    </li>
  )
}

function AddMistake({ onDone }: { onDone: () => void }) {
  const t = useT()
  const today = useToday()
  const [wrong, setWrong] = useState('')
  const [correct, setCorrect] = useState('')
  const [explain, setExplain] = useState('')
  const [topic, setTopic] = useState<TopicId | ''>('')
  const save = async () => {
    await addMistakeWithCard({ source: 'manual', wrong, correct, explain, topic: topic || undefined }, today)
    onDone()
  }
  return (
    <Card className="space-y-2">
      <input value={wrong} onChange={(e) => setWrong(e.target.value)} placeholder={t('What I said / wrote')} className={inputCls} lang="es" />
      <input value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder={t('Correct version')} className={inputCls} lang="es" />
      <input value={explain} onChange={(e) => setExplain(e.target.value)} placeholder={t('Why (optional)')} className={inputCls} />
      <select value={topic} onChange={(e) => setTopic(e.target.value as TopicId | '')} className={inputCls} aria-label={t('Topic')}>
        <option value="">{t('Topic (optional)')}</option>
        {TOPICS.map((tp) => (
          <option key={tp.id} value={tp.id}>
            {t(tp.name)}
          </option>
        ))}
      </select>
      <Button className="w-full" onClick={save} disabled={!correct.trim()}>
        {t('Save mistake + review card')}
      </Button>
    </Card>
  )
}
