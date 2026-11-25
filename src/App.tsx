import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Icon, type IconName } from './components/Icon'
import { cx } from './components/ui'
import { BLOCKS, db, type BlockKind } from './lib/db'
import { go, useRoute } from './lib/hooks'
import { SettingsContext, withDefaults, type Settings } from './lib/settings'
import { Bonus } from './screens/Bonus'
import { Calendar } from './screens/Calendar'
import { Library } from './screens/Library'
import { Progress } from './screens/Progress'
import { Session } from './screens/Session'
import { Settings as SettingsScreen } from './screens/Settings'
import { Today } from './screens/Today'

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
  { id: 'library', label: 'Library', icon: 'book' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
]

function useTheme(theme: Settings['theme'] | undefined) {
  useEffect(() => {
    if (!theme) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0c0a09' : '#fafaf9'))
    }
    apply()
    try {
      localStorage.setItem('paso-theme', theme)
    } catch {
      /* ignore */
    }
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export default function App() {
  const row = useLiveQuery(() => db.kv.get('settings').then((r) => r ?? null), [])
  const settings = row === undefined ? undefined : withDefaults(row?.value as Partial<Settings> | undefined)
  const route = useRoute()
  useTheme(settings?.theme)

  useEffect(() => {
    // Ask the browser to keep our IndexedDB data (no eviction under storage pressure).
    void navigator.storage?.persist?.()
  }, [])

  if (!settings) return null

  const [top = 'today', sub] = route
  const inSession = top === 'do' && BLOCKS.includes(sub as BlockKind)

  let screen
  if (inSession) screen = <Session key={sub} kind={sub as BlockKind} />
  else if (top === 'calendar') screen = <Calendar />
  else if (top === 'progress') screen = <Progress />
  else if (top === 'library') screen = <Library sub={sub} />
  else if (top === 'settings') screen = <SettingsScreen />
  else if (top === 'bonus') screen = <Bonus sub={sub} />
  else screen = <Today />

  return (
    <SettingsContext.Provider value={settings}>
      <div className="mx-auto min-h-dvh max-w-xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-28">{screen}</div>
      {!inSession && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
          <div className="mx-auto flex max-w-xl">
            {TABS.map((t) => {
              const active = top === t.id || (t.id === 'today' && (top === 'today' || top === 'bonus' || !route.length))
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex flex-1 flex-col items-center gap-0.5 pt-2 pb-2 text-[11px] font-medium',
                    active ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500',
                  )}
                >
                  <Icon name={t.icon} className="size-6" strokeWidth={active ? 2.2 : 1.8} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </SettingsContext.Provider>
  )
}
