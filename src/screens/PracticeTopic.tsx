import { useState } from 'react'
import { Icon } from '../components/Icon'
import { TOPIC_BY_ID } from '../data/topics'
import type { TopicId } from '../data/types'
import { todayStr } from '../lib/dates'
import type { DayRecord } from '../lib/db'
import { go } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { Drills } from './blocks/Drills'

/** Extra practice on one topic (from the grammar notes). Counts towards accuracy, not towards the day plan. */
export function PracticeTopic({ topic }: { topic: TopicId }) {
  const t = useT()
  const [day] = useState<DayRecord>(() => ({
    date: todayStr(),
    dayType: 'topic',
    topic,
    call: false,
    light: false,
    theme: 'daily',
    blocks: [],
    created: 0,
  }))
  if (!TOPIC_BY_ID[topic]) return null
  const back = () => go(`library/grammar/${topic}`)
  return (
    <div className="pb-6">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-stone-200 bg-stone-50/90 px-2 py-2 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <button type="button" onClick={back} className="rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label={t('Back')}>
          <Icon name="left" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{t('Practice')} · {t(TOPIC_BY_ID[topic].name)}</h1>
      </header>
      <Drills day={day} onFinish={back} topics={[topic]} />
    </div>
  )
}
