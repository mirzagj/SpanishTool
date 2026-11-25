import type { VocabTheme } from '../types'

export const THEMES: { id: VocabTheme; name: string }[] = [
  { id: 'daily', name: 'Daily life' },
  { id: 'opinions', name: 'Opinions & feelings' },
  { id: 'football', name: 'Football' },
  { id: 'travel', name: 'Travel' },
  { id: 'news', name: 'News & geopolitics' },
  { id: 'study-it', name: 'Study & IT' },
  { id: 'connectors', name: 'Connectors & fillers' },
]

export const THEME_NAME = Object.fromEntries(THEMES.map((t) => [t.id, t.name])) as Record<VocabTheme, string>
