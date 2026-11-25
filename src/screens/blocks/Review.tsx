import { useEffect, useRef, useState } from 'react'
import { PracticeCard, type PracticeResult } from '../../components/Practice'
import { Button, Card, Chip } from '../../components/ui'
import { db, type Card as SrsCard, type DayRecord } from '../../lib/db'
import { cardItem, type PracticeItem } from '../../lib/items'
import { useT } from '../../lib/i18n'
import { useSettings } from '../../lib/settings'
import { GRADE, schedule } from '../../lib/srs'

interface Entry {
  card: SrsCard
  item: PracticeItem
  retry: boolean
}

const shuffle = <T,>(a: T[]) => {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

export function Review({ day, onFinish }: { day: DayRecord; onFinish: () => void }) {
  const s = useSettings()
  const t = useT()
  const [queue, setQueue] = useState<Entry[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const [ahead, setAhead] = useState(false)
  const loaded = useRef(false)

  const toEntries = (cards: SrsCard[]) =>
    cards.flatMap((card) => {
      const item = cardItem(card, s.promptLang)
      return item ? [{ card, item, retry: false }] : []
    })

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    void (async () => {
      const due = await db.cards.where('due').belowOrEqual(day.date).toArray()
      // oldest due first, shuffled within the same day so similar cards don't cluster
      const byDue = new Map<string, SrsCard[]>()
      for (const c of due) byDue.set(c.due, [...(byDue.get(c.due) ?? []), c])
      const ordered = [...byDue.keys()].sort().flatMap((k) => shuffle(byDue.get(k)!))
      setQueue(toEntries(ordered))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const practiseAhead = async () => {
    const next = await db.cards.where('due').above(day.date).limit(10).sortBy('due')
    setAhead(true)
    setQueue((q) => [...(q ?? []), ...toEntries(next)])
  }

  if (!queue) return null
  const cur = queue[idx]

  const onNext = async (r: PracticeResult) => {
    if (!cur.retry) {
      const q = r.verdict === 'wrong' ? GRADE.wrong : r.verdict === 'almost' || r.hintsUsed > 0 ? GRADE.hard : GRADE.good
      const fresh = (await db.cards.get(cur.card.id)) ?? cur.card
      await db.cards.put({ ...fresh, ...schedule(fresh, q, day.date) })
      if (cur.card.kind !== 'custom') {
        await db.attempts.add({
          date: day.date,
          ts: Date.now(),
          itemId: cur.card.refId!,
          topic: cur.item.topic,
          source: cur.card.kind === 'vocab' ? 'vocab' : 'review',
          correct: r.correct,
          score: r.verdict === 'correct' ? 1 : r.verdict === 'almost' ? 0.5 : 0,
          flags: r.flags,
          answer: r.answer,
        })
      }
      setScore((sc) => ({ right: sc.right + (r.verdict === 'wrong' ? 0 : 1), total: sc.total + 1 }))
    }
    // a card you missed comes back once at the end of the session
    if (r.verdict === 'wrong' && !cur.retry) setQueue((q) => [...q!, { ...cur, retry: true }])
    setIdx((i) => i + 1)
  }

  if (!cur) {
    const nothing = score.total === 0
    return (
      <Card className="space-y-4 text-center">
        {nothing ? (
          <>
            <p className="text-3xl">🌿</p>
            <p className="text-[17px] font-medium">{t('Nothing due today')}</p>
            <p className="text-[15px] text-stone-600 dark:text-stone-300">
              {t('Your review deck fills up from your drill mistakes, new vocabulary, writing corrections and calls.')}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-stone-500 dark:text-stone-400">{ahead ? t('Practised ahead') : t('Review complete')}</p>
            <p className="text-4xl font-semibold tabular-nums">
              {score.right}/{score.total}
            </p>
            <p className="text-[15px] text-stone-600 dark:text-stone-300">{t('Missed cards come back tomorrow; the rest are spaced further apart.')}</p>
          </>
        )}
        <div className="flex flex-col gap-2">
          <Button size="lg" variant="success" icon="check" onClick={onFinish}>
            {t('Finish block')}
          </Button>
          <Button size="lg" variant="secondary" onClick={practiseAhead}>
            {t('Practise ahead (next 10 cards)')}
          </Button>
        </div>
      </Card>
    )
  }

  const left = queue.length - idx
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
        <span className="tabular-nums">{t('{n} left', { n: left })}</span>
        <Chip tone={cur.card.kind === 'vocab' ? 'green' : cur.card.kind === 'custom' ? 'amber' : 'sky'}>
          {cur.card.kind === 'vocab' ? t('Vocabulary') : cur.card.kind === 'custom' ? t('Your mistake') : t('Grammar')}
        </Chip>
      </div>
      <Card>
        <PracticeCard key={`${cur.card.id}-${idx}`} item={cur.item} retry={cur.retry} onNext={onNext} />
      </Card>
    </div>
  )
}
