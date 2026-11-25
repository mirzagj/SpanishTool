import { useEffect, useRef, useState } from 'react'
import { todayStr } from './dates'
import type { BlockKind } from './db'
import { db } from './db'
import { addBlockSeconds } from './plan'

/** Today's date; updates when the app comes back to the foreground after midnight. */
export function useToday(): string {
  const [t, setT] = useState(todayStr)
  useEffect(() => {
    const upd = () => setT(todayStr())
    const id = setInterval(upd, 60_000)
    document.addEventListener('visibilitychange', upd)
    window.addEventListener('focus', upd)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', upd)
      window.removeEventListener('focus', upd)
    }
  }, [])
  return t
}

/** Tiny hash router: #/today, #/do/drills, #/library/mistakes … */
export function useRoute(): string[] {
  const read = () =>
    window.location.hash
      .replace(/^#\/?/, '')
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent)
  const [r, setR] = useState(read)
  useEffect(() => {
    const on = () => {
      setR(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export const go = (path: string) => {
  window.location.hash = '#/' + path
}

/**
 * Counts seconds while a block screen is open and visible, and saves them to the day record.
 */
export function useBlockTimer(date: string, kind: BlockKind) {
  const [seconds, setSeconds] = useState<number | null>(null)
  const [running, setRunning] = useState(true)
  const pending = useRef(0)

  useEffect(() => {
    let alive = true
    db.days.get(date).then((d) => {
      if (alive) setSeconds(d?.blocks.find((b) => b.kind === kind)?.seconds ?? 0)
    })
    return () => {
      alive = false
    }
  }, [date, kind])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      pending.current += 1
      setSeconds((s) => (s ?? 0) + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    const flush = () => {
      const n = pending.current
      pending.current = 0
      if (n) void addBlockSeconds(date, kind, n)
    }
    const id = setInterval(flush, 10_000)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      clearInterval(id)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
      flush()
    }
  }, [date, kind])

  return { seconds: seconds ?? 0, running, toggle: () => setRunning((r) => !r) }
}
