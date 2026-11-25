import { useEffect, useRef, useState } from 'react'
import { PracticeCard, type PracticeResult } from '../../components/Practice'
import { Button, Card, Chip } from '../../components/ui'
import { topicShort } from '../../data/topics'
import type { Exercise, TopicId } from '../../data/types'
import type { DayRecord } from '../../lib/db'
import { exerciseItem, exercisePrompt } from '../../lib/items'
import { loadContext } from '../../lib/plan'
import { recordDrill } from '../../lib/practice'
import { buildDrillQueue } from '../../lib/select'
import { useSettings } from '../../lib/settings'

export function Drills({ day, onFinish, topics }: { day: DayRecord; onFinish: () => void; topics?: TopicId[] }) {
  const s = useSettings()
  const [queue, setQueue] = useState<Exercise[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const started = useRef(false)

  const loadMore = async (n: number, exclude: Exercise[] = []) => {
    const ctx = await loadContext(day.date)
    const q = buildDrillQueue({
      day,
      reached: topics ?? ctx.reached,
      attempts: ctx.attempts,
      acc: ctx.acc,
      count: n,
      exclude: new Set(exclude.map((e) => e.id)),
    })
    setQueue([...exclude, ...q])
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void loadMore(12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!queue) return null
  const cur = queue[idx]

  const onNext = async (r: PracticeResult) => {
    await recordDrill(cur, { correct: r.correct, answer: r.answer, prompt: exercisePrompt(cur, s.promptLang), today: day.date })
    setScore((sc) => ({ right: sc.right + (r.correct ? 1 : 0), total: sc.total + 1 }))
    setIdx((i) => i + 1)
  }

  if (!cur) {
    const pct = score.total ? Math.round((score.right / score.total) * 100) : 0
    return (
      <Card className="space-y-4 text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">Round complete</p>
        <p className="text-4xl font-semibold tabular-nums">
          {score.right}/{score.total}
        </p>
        <p className="text-[15px] text-stone-600 dark:text-stone-300">
          {pct >= 85 ? '¡Muy bien! Solid.' : pct >= 60 ? 'Good work — your mistakes are now review cards.' : 'Tough round. Your mistakes go into tomorrow’s review.'}
        </p>
        <div className="flex flex-col gap-2">
          <Button size="lg" variant="success" icon="check" onClick={onFinish}>
            {topics ? 'Done' : 'Finish block'}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => void loadMore(8, queue)}>
            Keep going (+8)
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
        <span className="tabular-nums">
          {idx + 1} / {queue.length}
        </span>
        <Chip tone={cur.topic === day.topic ? 'sky' : 'stone'}>{topicShort(cur.topic)}</Chip>
      </div>
      <Card>
        <PracticeCard key={`${cur.id}-${idx}`} item={exerciseItem(cur, s.promptLang)} onNext={onNext} />
      </Card>
    </div>
  )
}
