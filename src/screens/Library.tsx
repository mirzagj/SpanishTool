import { PageHeader, cx } from '../components/ui'
import { go } from '../lib/hooks'
import { useT } from '../lib/i18n'
import { GrammarNotes } from './library/GrammarNotes'
import { Memos } from './library/Memos'
import { Mistakes } from './library/Mistakes'
import { VocabList } from './library/VocabList'

const TABS = [
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'vocab', label: 'Vocabulary' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'memos', label: 'Voice memos' },
]

export function Library({ sub, detail }: { sub?: string; detail?: string }) {
  const t = useT()
  const tab = TABS.some((t) => t.id === sub) ? sub! : 'mistakes'
  return (
    <div>
      <PageHeader title={t('Library')} />
      <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-stone-200 px-4 dark:border-stone-800">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => go(`library/${tb.id}`)}
            className={cx(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-[15px] font-medium',
              tab === tb.id ? 'border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100' : 'border-transparent text-stone-500 dark:text-stone-400',
            )}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>
      {tab === 'mistakes' && <Mistakes />}
      {tab === 'vocab' && <VocabList />}
      {tab === 'grammar' && <GrammarNotes topic={detail} />}
      {tab === 'memos' && <Memos />}
    </div>
  )
}
