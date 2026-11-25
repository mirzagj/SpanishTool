import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Button, Card, Chip, Empty, cx, inputCls } from '../../components/ui'
import { VOCAB } from '../../data/vocab'
import { THEMES, THEME_NAME } from '../../data/vocab/themes'
import { splitExample } from '../../lib/items'
import { db, type Card as SrsCard } from '../../lib/db'
import { useToday } from '../../lib/hooks'
import { addCustomWord } from '../../lib/practice'
import { useSettings } from '../../lib/settings'
import { isMature } from '../../lib/srs'

type Status = 'new' | 'learning' | 'mature'
const statusOf = (c?: SrsCard): Status => (!c ? 'new' : isMature(c) ? 'mature' : 'learning')
const STATUS_TONE = { new: 'stone', learning: 'amber', mature: 'green' } as const

export function VocabList() {
  const s = useSettings()
  const [theme, setTheme] = useState<string>('all')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const cards = useLiveQuery(() => db.cards.where('kind').anyOf('vocab', 'custom').toArray(), [])
  const byRef = useMemo(() => Object.fromEntries((cards ?? []).filter((c) => c.kind === 'vocab').map((c) => [c.refId, c])), [cards])
  const custom = (cards ?? []).filter((c) => c.kind === 'custom' && c.theme === 'custom')

  const learned = VOCAB.filter((v) => byRef[v.id]).length + custom.length
  const mature = VOCAB.filter((v) => byRef[v.id] && isMature(byRef[v.id])).length + custom.filter(isMature).length
  const ql = q.toLowerCase()

  const rows = VOCAB.filter(
    (v) =>
      (theme === 'all' || v.theme === theme) &&
      (filter === 'all' || statusOf(byRef[v.id]) === filter) &&
      (!q || `${v.es} ${v.nl} ${v.en} ${v.alts.join(' ')}`.toLowerCase().includes(ql)),
  )
  const customRows = custom.filter(
    (c) => (theme === 'all' || theme === 'custom') && (filter === 'all' || statusOf(c) === filter) && (!q || `${c.answers?.[0]} ${c.front}`.toLowerCase().includes(ql)),
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="!p-3">
          <div className="text-xl font-semibold tabular-nums">{VOCAB.length + custom.length}</div>
          <div className="text-xs text-stone-500">words</div>
        </Card>
        <Card className="!p-3">
          <div className="text-xl font-semibold tabular-nums">{learned}</div>
          <div className="text-xs text-stone-500">learned</div>
        </Card>
        <Card className="!p-3">
          <div className="text-xl font-semibold tabular-nums">{mature}</div>
          <div className="text-xs text-stone-500">mature (21+ days)</div>
        </Card>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Spanish, Dutch or English" className={cx(inputCls, '!py-2 pl-9 !text-[15px]')} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as Status | 'all')} className={cx(inputCls, '!w-auto !py-2 !text-[15px]')} aria-label="Filter by status">
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="learning">Learning</option>
          <option value="mature">Mature</option>
        </select>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {[{ id: 'all', name: 'All themes' }, ...THEMES, { id: 'custom', name: 'My words' }].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={cx(
              'shrink-0 rounded-full px-3 py-1 text-sm font-medium',
              theme === t.id ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300">
        <Icon name="plus" className="size-4" /> Add my own word
      </button>
      {adding && <AddWord onDone={() => setAdding(false)} />}

      {!rows.length && !customRows.length ? (
        <Empty>No words match.</Empty>
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {customRows.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium" lang="es">
                    {c.answers?.[0]}
                  </span>
                  <Chip tone={STATUS_TONE[statusOf(c)]}>{statusOf(c)}</Chip>
                </div>
                <p className="text-sm text-stone-500 dark:text-stone-400">{c.front}</p>
                {c.context && (
                  <p className="mt-0.5 text-sm text-stone-600 italic dark:text-stone-300" lang="es">
                    {c.context}
                  </p>
                )}
              </li>
            ))}
            {rows.slice(0, 250).map((v) => {
              const st = statusOf(byRef[v.id])
              return (
                <li key={v.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium" lang="es">
                      {v.es}
                    </span>
                    <Chip tone={STATUS_TONE[st]}>{st}</Chip>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {s.promptLang === 'nl' ? v.nl : v.en} · {THEME_NAME[v.theme]}
                  </p>
                  <p className="mt-0.5 text-sm text-stone-600 italic dark:text-stone-300" lang="es">
                    {splitExample(v.ex).full}
                  </p>
                  {v.spain && <p className="mt-0.5 text-xs text-sky-700 dark:text-sky-300">Spain · recognise only: {v.spain}</p>}
                </li>
              )
            })}
          </ul>
          {rows.length > 250 && <p className="px-4 py-3 text-center text-sm text-stone-500">Showing 250 of {rows.length} — search or pick a theme to narrow down.</p>}
        </Card>
      )}
    </div>
  )
}

export function AddWord({ onDone, source = 'manual' }: { onDone: () => void; source?: 'manual' | 'series' }) {
  const today = useToday()
  const [word, setWord] = useState('')
  const [sentence, setSentence] = useState('')
  const [translation, setTranslation] = useState('')
  const save = async () => {
    await addCustomWord({ word, sentence, translation, source }, today)
    setWord('')
    setSentence('')
    setTranslation('')
    onDone()
  }
  return (
    <Card className="space-y-2">
      <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Spanish word or phrase" className={inputCls} lang="es" />
      <input value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder="Sentence where you heard it" className={inputCls} lang="es" />
      <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Translation (Dutch or English)" className={inputCls} />
      <Button className="w-full" onClick={save} disabled={!word.trim() || !translation.trim()}>
        Add to my review deck
      </Button>
    </Card>
  )
}
