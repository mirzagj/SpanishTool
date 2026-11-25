import { useLiveQuery } from 'dexie-react-hooks'
import { Icon } from '../../components/Icon'
import { AudioPlayer } from '../../components/Recorder'
import { Card, Chip, Empty } from '../../components/ui'
import { fmtDuration, fmtLong } from '../../lib/dates'
import { db, type Recording } from '../../lib/db'

export function Memos() {
  const recs = useLiveQuery(() => db.recordings.orderBy('id').reverse().toArray(), [])
  if (!recs) return null
  if (!recs.length) return <Empty>Recordings from the speaking block appear here.</Empty>

  const groups = new Map<string, Recording[]>()
  for (const r of recs) groups.set(r.date, [...(groups.get(r.date) ?? []), r])
  const totalMin = Math.round(recs.reduce((a, r) => a + r.duration, 0) / 60)

  const remove = async (r: Recording) => {
    if (!confirm('Delete this recording?')) return
    await db.recordings.delete(r.id!)
    await db.recordings.where('parentId').equals(r.id!).delete()
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {recs.length} recordings · {totalMin} min of Spanish spoken. Stored only on this device.
      </p>
      {[...groups.entries()].map(([date, list]) => (
        <div key={date}>
          <h3 className="mb-2 text-sm font-semibold text-stone-600 dark:text-stone-300">{fmtLong(date)}</h3>
          <div className="space-y-2">
            {list.map((r) => (
              <Card key={r.id} className="space-y-2 !p-3">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[15px]" lang="es">
                    {r.prompt}
                  </p>
                  <button type="button" onClick={() => remove(r)} className="rounded p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label="Delete recording">
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip>{r.kind === 'redo' ? 'Redo' : 'Speaking'}</Chip>
                  <Chip>{fmtDuration(r.duration)}</Chip>
                  {r.redo && <Chip tone="amber">Redo worst sentence</Chip>}
                </div>
                <AudioPlayer blob={r.blob} />
                {r.transcript && (
                  <p className="text-sm text-stone-600 italic dark:text-stone-300" lang="es">
                    {r.transcript}
                  </p>
                )}
                {r.note && <p className="text-sm text-stone-600 dark:text-stone-300">{r.note}</p>}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
