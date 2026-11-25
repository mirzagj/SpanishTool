import type { IconName } from '../components/Icon'
import { topicShort } from '../data/topics'
import { THEME_NAME } from '../data/vocab/themes'
import type { BlockKind, DayRecord } from './db'
import { translate, type T } from './i18n'

const EN: T = (k, v) => translate('en', k, v)

export function blockMeta(kind: BlockKind, day: DayRecord, due?: number, t: T = EN): { title: string; sub: string; icon: IconName } {
  switch (kind) {
    case 'review':
      return {
        title: t('Review'),
        icon: 'layers',
        sub: due === undefined ? t('Spaced repetition') : due ? t(due === 1 ? '{n} card due' : '{n} cards due', { n: due }) : t('Nothing due — all caught up'),
      }
    case 'drills':
      return { title: t('Tense & structure drills'), icon: 'edit', sub: t('{topic} + adaptive review', { topic: t(topicShort(day.topic)) }) }
    case 'vocab':
      return { title: t('Active vocabulary'), icon: 'book', sub: t(THEME_NAME[day.theme]) }
    case 'writing':
      return { title: t('Writing'), icon: 'feather', sub: t('4–6 sentences · {topic}', { topic: t(topicShort(day.topic)) }) }
    case 'speaking':
      return day.call
        ? { title: t('Call with Mexican friend'), icon: 'phone', sub: t('Timer + save their corrections') }
        : { title: t('Speaking'), icon: 'mic', sub: t('Record, listen back, redo') }
  }
}
