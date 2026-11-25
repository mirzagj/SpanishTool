import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, cx } from '../components/ui'
import { blockMeta } from '../lib/blocks'
import { fmtDuration, todayStr } from '../lib/dates'
import { db, type BlockKind } from '../lib/db'
import { go, useBlockTimer } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { ensureDay, setBlockDone } from '../lib/plan'
import { Drills } from './blocks/Drills'
import { Review } from './blocks/Review'
import { Speaking } from './blocks/Speaking'
import { Vocab } from './blocks/Vocab'
import { Writing } from './blocks/Writing'

export function Session({ kind }: { kind: BlockKind }) {
  // The date is fixed when the session opens, so a session that runs past midnight still counts for that day.
  const [date] = useState(todayStr)
  const t = useT()
  useEffect(() => {
    void ensureDay(date)
  }, [date])
  const day = useLiveQuery(() => db.days.get(date), [date])
  const timer = useBlockTimer(date, kind)
  const block = day?.blocks.find((b) => b.kind === kind)

  if (!day || !block) return null
  const meta = blockMeta(kind, day, undefined, t)
  const remaining = block.minutes * 60 - timer.seconds
  const over = remaining < 0

  const finish = async () => {
    await setBlockDone(date, kind, true)
    go('today')
  }

  const body = {
    review: <Review day={day} onFinish={finish} />,
    drills: <Drills day={day} onFinish={finish} />,
    vocab: <Vocab day={day} onFinish={finish} />,
    writing: <Writing day={day} onFinish={finish} />,
    speaking: <Speaking day={day} onFinish={finish} />,
  }[kind]

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-stone-200 bg-stone-50/90 px-2 py-2 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <button type="button" onClick={() => go('today')} className="rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label={t('Back to Today')}>
          <Icon name="left" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{meta.title}</h1>
        <button
          type="button"
          onClick={timer.toggle}
          aria-label={timer.running ? t('Pause timer') : t('Resume timer')}
          className={cx(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums',
            over ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
            !timer.running && 'opacity-60',
          )}
        >
          <Icon name={timer.running ? 'pause' : 'play'} className="size-3.5" />
          {over ? `+${fmtDuration(-remaining)}` : fmtDuration(remaining)}
        </button>
      </header>
      {over && !block.done && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          {t('Time’s up for this block — finish what you’re doing and move on when you like.')}
        </p>
      )}
      {body}
      <div className="mt-6">
        {block.done ? (
          <Button variant="ghost" className="w-full" onClick={() => setBlockDone(date, kind, false)}>
            {t('Block marked done · undo')}
          </Button>
        ) : kind === 'writing' || kind === 'speaking' ? null : (
          <Button variant="ghost" className="w-full" icon="check" onClick={finish}>
            {t('Mark block done & go back')}
          </Button>
        )}
      </div>
    </div>
  )
}
