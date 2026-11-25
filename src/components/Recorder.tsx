import { useEffect, useRef, useState } from 'react'
import { fmtDuration } from '../lib/dates'
import { useT } from '../lib/i18n'
import { canRecord, speechCtor, startRecording, startTranscript, type RecordingResult } from '../lib/recorder'
import { Icon } from './Icon'
import { cx } from './ui'

export function AudioPlayer({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url ? <audio controls preload="metadata" src={url} className="h-10 w-full" /> : null
}

/** Big record button with timer and an optional live es-MX transcript. */
export function Recorder({
  onSaved,
  transcript,
  size = 'lg',
  label,
}: {
  onSaved: (r: RecordingResult & { transcript?: string }) => Promise<void> | void
  transcript: boolean
  size?: 'lg' | 'sm'
  label?: string
}) {
  const t = useT()
  const [state, setState] = useState<'idle' | 'starting' | 'rec' | 'saving'>('idle')
  const [secs, setSecs] = useState(0)
  const [live, setLive] = useState({ final: '', interim: '' })
  const [err, setErr] = useState('')
  const [tErr, setTErr] = useState('')
  const recRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null)
  const trRef = useRef<{ stop: () => string } | null>(null)

  useEffect(() => {
    if (state !== 'rec') return
    const id = setInterval(() => setSecs((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [state])

  useEffect(
    () => () => {
      recRef.current?.cancel()
      trRef.current?.stop()
    },
    [],
  )

  if (!canRecord()) {
    return <p className="text-sm text-stone-600 dark:text-stone-300">{t('Recording isn’t supported in this browser. Try Chrome or Safari.')}</p>
  }

  const start = async () => {
    setErr('')
    setTErr('')
    setState('starting')
    try {
      recRef.current = await startRecording()
    } catch {
      setErr(t('Microphone access was blocked. Allow the microphone for this site in your browser settings and try again.'))
      setState('idle')
      return
    }
    setSecs(0)
    setLive({ final: '', interim: '' })
    if (transcript) {
      trRef.current = startTranscript(
        (final, interim) => setLive({ final, interim }),
        (m) => setTErr(t(m)),
      )
    }
    setState('rec')
  }

  const stop = async () => {
    if (!recRef.current) return
    setState('saving')
    const text = trRef.current?.stop()
    trRef.current = null
    const res = await recRef.current.stop()
    recRef.current = null
    await onSaved({ ...res, transcript: text?.trim() || undefined })
    setState('idle')
  }

  const recording = state === 'rec'
  const big = size === 'lg'
  return (
    <div className={cx('flex flex-col items-center', big ? 'gap-3 py-2' : 'gap-2')}>
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={state === 'starting' || state === 'saving'}
        aria-label={recording ? t('Stop recording') : t('Start recording')}
        className={cx(
          'flex items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-95',
          big ? 'size-20' : 'size-12',
          recording ? 'animate-pulse bg-rose-600' : 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900',
        )}
      >
        <Icon name={recording ? 'stop' : 'mic'} className={big ? 'size-8' : 'size-5'} />
      </button>
      <p className="text-sm text-stone-500 tabular-nums dark:text-stone-400">
        {recording ? t('Recording · {time} — tap to stop', { time: fmtDuration(secs) }) : state === 'saving' ? t('Saving…') : (label ?? t('Tap to record'))}
      </p>
      {transcript && recording && (live.final || live.interim) && (
        <p className="w-full rounded-xl bg-stone-100 px-3 py-2 text-[15px] dark:bg-stone-800" lang="es">
          {live.final} <span className="text-stone-400">{live.interim}</span>
        </p>
      )}
      {transcript && !speechCtor() && big && <p className="text-xs text-stone-400">{t('Live transcript isn’t available in this browser (works in Chrome / Safari).')}</p>}
      {tErr && <p className="text-xs text-amber-700 dark:text-amber-400">{tErr}</p>}
      {err && <p className="text-sm text-rose-700 dark:text-rose-400">{err}</p>}
    </div>
  )
}
