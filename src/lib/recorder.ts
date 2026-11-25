/** In-browser audio recording (MediaRecorder) and optional es-MX live transcript (Web Speech API). */

export const canRecord = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

function pickMime(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((c) => MediaRecorder.isTypeSupported?.(c))
}

export interface RecordingResult {
  blob: Blob
  mime: string
  duration: number
}

export async function startRecording(): Promise<{ stop: () => Promise<RecordingResult>; cancel: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  const t0 = Date.now()
  rec.start(1000)
  const release = () => stream.getTracks().forEach((t) => t.stop())
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          release()
          const type = rec.mimeType || mime || 'audio/webm'
          resolve({ blob: new Blob(chunks, { type }), mime: type, duration: (Date.now() - t0) / 1000 })
        }
        rec.stop()
      }),
    cancel: () => {
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
      release()
    },
  }
}

/* ---- Web Speech API (Chrome/Edge/Safari; not Firefox) ---- */

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type Ctor = new () => SpeechRecognitionLike

export function speechCtor(): Ctor | null {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Starts an es-MX transcript that keeps restarting after pauses until stop() is called. */
export function startTranscript(onUpdate: (finalText: string, interim: string) => void, onError: (msg: string) => void): { stop: () => string } | null {
  const C = speechCtor()
  if (!C) return null
  let finalText = ''
  let active = true
  const r = new C()
  r.lang = 'es-MX'
  r.continuous = true
  r.interimResults = true
  r.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) finalText = `${finalText} ${res[0].transcript}`.trim()
      else interim += res[0].transcript
    }
    onUpdate(finalText, interim)
  }
  r.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return
    active = false
    onError(e.error === 'not-allowed' ? 'Speech recognition was blocked.' : `Transcript unavailable (${e.error}).`)
  }
  r.onend = () => {
    if (active) {
      try {
        r.start()
      } catch {
        /* ignore */
      }
    }
  }
  try {
    r.start()
  } catch {
    return null
  }
  return {
    stop: () => {
      active = false
      try {
        r.stop()
      } catch {
        /* ignore */
      }
      return finalText
    },
  }
}
