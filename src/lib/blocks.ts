import type { IconName } from '../components/Icon'
import { topicShort } from '../data/topics'
import { THEME_NAME } from '../data/vocab/themes'
import type { BlockKind, DayRecord } from './db'

export function blockMeta(kind: BlockKind, day: DayRecord, due?: number): { title: string; sub: string; icon: IconName } {
  switch (kind) {
    case 'review':
      return {
        title: 'Review',
        icon: 'layers',
        sub: due === undefined ? 'Spaced repetition' : due ? `${due} card${due === 1 ? '' : 's'} due` : 'Nothing due — all caught up',
      }
    case 'drills':
      return { title: 'Tense & structure drills', icon: 'edit', sub: `${topicShort(day.topic)} + adaptive review` }
    case 'vocab':
      return { title: 'Active vocabulary', icon: 'book', sub: THEME_NAME[day.theme] }
    case 'writing':
      return { title: 'Writing', icon: 'feather', sub: `4–6 sentences · ${topicShort(day.topic)}` }
    case 'speaking':
      return day.call
        ? { title: 'Call with Mexican friend', icon: 'phone', sub: 'Timer + save their corrections' }
        : { title: 'Speaking', icon: 'mic', sub: 'Record, listen back, redo' }
  }
}
