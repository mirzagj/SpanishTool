import { useEffect, useRef, useState } from 'react'
import { PracticeCard, type PracticeResult } from '../../components/Practice'
import { Button, Card, Chip, cx } from '../../components/ui'
import { VOCAB_BY_THEME } from '../../data/vocab'
import { THEMES, THEME_NAME } from '../../data/vocab/themes'
import type { VocabItem, VocabTheme } from '../../data/types'
import { db, type DayRecord } from '../../lib/db'
import { vocabItem } from '../../lib/items'
import { useSettings } from '../../lib/settings'
import { GRADE, NEW_SRS, schedule } from '../../lib/srs'

interface Entry {
  v: VocabItem
  tries: number
}

export function Vocab({ day, onFinish }: { day: DayRecord; onFinish: () => void }) {
  const s = useSettings()
  const [theme, setTheme] = useState<VocabTheme>(day.theme)
  const [queue, setQueue] = useState<Entry[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [learned, setLearned] = useState<{ v: VocabItem; firstTry: boolean }[]>([])
  const [remaining, setRemaining] = useState(0)
  const seen = useRef(new Set<string>())

  const load = async (t: VocabTheme, n: number, alive: () => boolean = () => true) => {
    const have = new Set((await db.cards.where('kind').equals('vocab').toArray()).map((c) => c.refId))
    if (!alive()) return
    const fresh = (VOCAB_BY_THEME[t] ?? []).filter((v) => !have.has(v.id) && !seen.current.has(v.id))
    setRemaining(fresh.length)
    const pick = fresh.slice(0, n)
    pick.forEach((v) => seen.current.add(v.id))
    setQueue((q) => [...(q ?? []).slice(0, idx), ...pick.map((v) => ({ v, tries: 0 }))])
  }

  useEffect(() => {
    let alive = true
    setIdx(0)
    setQueue(null)
    void load(theme, s.newWordsPerDay, () => alive)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  if (!queue) return null
  const cur = queue[idx]

  const onNext = async (r: PracticeResult) => {
    const v = cur.v
    await db.attempts.add({ date: day.date, ts: Date.now(), itemId: v.id, source: 'vocab', correct: r.correct, answer: r.answer })
    if (cur.tries === 0) {
      // first encounter: the word enters the spaced-repetition deck
      const q = !r.correct ? GRADE.wrong : r.hintsUsed > 0 ? GRADE.hard : GRADE.good
      const id = `vo:${v.id}`
      if (!(await db.cards.get(id))) {
        await db.cards.put({ id, kind: 'vocab', refId: v.id, source: 'vocab', theme: v.theme, ...schedule(NEW_SRS(day.date), q, day.date), created: Date.now() })
      }
      setLearned((l) => [...l, { v, firstTry: r.correct }])
    }
    // keep producing the word until you get it right (max 3 tries)
    if (!r.correct && cur.tries < 2) setQueue((q) => [...q!, { v, tries: cur.tries + 1 }])
    setIdx((i) => i + 1)
  }

  const themePicker = (
    <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          className={cx(
            'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium',
            t.id === theme
              ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
              : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300',
          )}
        >
          {t.name}
        </button>
      ))}
    </div>
  )

  if (!cur) {
    return (
      <div>
        {themePicker}
        <Card className="space-y-4">
          {learned.length ? (
            <>
              <p className="text-center text-sm text-stone-500 dark:text-stone-400">New in your deck · {THEME_NAME[theme]}</p>
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {learned.map(({ v, firstTry }) => (
                  <li key={v.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="font-medium" lang="es">
                      {v.es}
                    </span>
                    <span className="text-right text-sm text-stone-500 dark:text-stone-400">
                      {s.promptLang === 'nl' ? v.nl : v.en} {firstTry && <span className="text-emerald-600">✓</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-center text-sm text-stone-500 dark:text-stone-400">These come back in tomorrow’s review.</p>
            </>
          ) : (
            <p className="text-center text-[15px] text-stone-600 dark:text-stone-300">
              {remaining === 0 ? `All ${THEME_NAME[theme]} words are already in your deck. Pick another theme above.` : 'No new words loaded.'}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button size="lg" variant="success" icon="check" onClick={onFinish}>
              Finish block
            </Button>
            {remaining > 0 && (
              <Button size="lg" variant="secondary" onClick={() => void load(theme, 5)}>
                5 more words
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {themePicker}
      <div className="mb-3 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
        <span className="tabular-nums">
          {Math.min(idx + 1, queue.length)} / {queue.length}
        </span>
        <Chip tone="green">{THEME_NAME[theme]}</Chip>
      </div>
      <Card>
        <PracticeCard key={`${cur.v.id}-${idx}`} item={vocabItem(cur.v, s.promptLang)} retry={cur.tries > 0} onNext={onNext} />
      </Card>
    </div>
  )
}
