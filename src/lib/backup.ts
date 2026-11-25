import { TABLES, db, type Recording } from './db'

const APP = 'paso-diario'
const VERSION = 1

async function blobToBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export interface Backup {
  app: string
  version: number
  exportedAt: string
  audioIncluded: boolean
  tables: Record<string, unknown[]>
}

export async function exportData(includeAudio: boolean): Promise<Backup> {
  const tables: Record<string, unknown[]> = {}
  for (const t of TABLES) {
    if (t === 'recordings') {
      tables[t] = includeAudio
        ? await Promise.all(((await db.recordings.toArray()) as Recording[]).map(async (r) => ({ ...r, blob: await blobToBase64(r.blob) })))
        : []
    } else {
      tables[t] = await db.table(t).toArray()
    }
  }
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), audioIncluded: includeAudio, tables }
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Replace all data with a backup. Recordings are kept when the backup was made without audio. */
export async function importData(json: string): Promise<Record<string, number>> {
  let data: Backup
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (data?.app !== APP || typeof data.tables !== 'object') throw new Error('This is not a Paso Diario backup file.')
  const counts: Record<string, number> = {}
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLES) {
      if (t === 'recordings' && !data.audioIncluded) continue
      let rows = (data.tables[t] ?? []) as Record<string, unknown>[]
      if (t === 'recordings') rows = rows.map((r) => ({ ...r, blob: base64ToBlob(String(r.blob ?? ''), String(r.mime ?? 'audio/webm')) }))
      await db.table(t).clear()
      await db.table(t).bulkPut(rows)
      counts[t] = rows.length
    }
  })
  return counts
}

export async function resetAll() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}
