import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../lib/i18n'

/** Chart colours come from CSS variables (index.css) so light and dark are each tuned. */
export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(320)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 70, 0), width - 140)
  return (
    <div
      className="pointer-events-none absolute z-10 w-[140px] rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs shadow-md dark:border-stone-700 dark:bg-stone-900"
      style={{ left, top: Math.max(0, y) }}
    >
      {children}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.line ? <span className="h-0.5 w-3.5 rounded" style={{ background: i.color }} /> : <span className="size-2.5 rounded-sm" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  )
}

export interface LineSeries {
  label: string
  color: string
  values: (number | null)[]
}

/** Lines on a single 0–100 % axis, with end labels and a crosshair tooltip. */
export function LineChart({ labels, series, height = 200, unit = '%' }: { labels: string[]; series: LineSeries[]; height?: number; unit?: string }) {
  const t = useT()
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const m = { l: 42, r: 50, t: 10, b: 22 }
  const pw = width - m.l - m.r
  const ph = height - m.t - m.b
  const n = labels.length
  const x = (i: number) => m.l + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw)
  const y = (v: number) => m.t + ph - (v / 100) * ph

  const paths = series.map((s) => {
    let d = ''
    let pen = false
    s.values.forEach((v, i) => {
      if (v === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    })
    return d
  })

  // direct labels at each line's last point, nudged apart
  const ends = series
    .map((s, k) => {
      const i = s.values.map((v, j) => (v === null ? -1 : j)).filter((j) => j >= 0).pop()
      return i === undefined ? null : { k, i, v: s.values[i]!, ly: y(s.values[i]!) }
    })
    .filter((e): e is { k: number; i: number; v: number; ly: number } => !!e)
    .sort((a, b) => a.ly - b.ly)
  for (let j = 1; j < ends.length; j++) if (ends[j].ly - ends[j - 1].ly < 13) ends[j].ly = ends[j - 1].ly + 13

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
    setHover(best)
  }

  const step = Math.ceil(n / Math.max(1, Math.floor(pw / 46)))
  return (
    <div ref={ref} className="relative select-none">
      <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={t('Accuracy over time')}>
        {[0, 50, 100].map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="fill-stone-500 text-[11px] tabular-nums dark:fill-stone-400">
              {t}
              {unit}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          (n - 1 - i) % step === 0 ? (
            <text key={l} x={x(i)} y={height - 6} textAnchor="middle" className="fill-stone-500 text-[11px] dark:fill-stone-400">
              {l}
            </text>
          ) : null,
        )}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ph} stroke="var(--grid-strong)" strokeWidth={1} />}
        {series.map((s, k) => (
          <path key={s.label} d={paths[k]} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s, k) =>
          s.values.map((v, i) =>
            v === null || (i !== hover && !(s.values.filter((z) => z !== null).length === 1)) ? null : (
              <circle key={`${k}-${i}`} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke="var(--chart-surface)" strokeWidth={2} />
            ),
          ),
        )}
        {ends.map((e) => (
          <g key={e.k}>
            <circle cx={x(e.i)} cy={y(e.v)} r={4} fill={series[e.k].color} stroke="var(--chart-surface)" strokeWidth={2} />
            <text x={x(e.i) + 8} y={e.ly + 4} className="fill-stone-700 text-[11px] font-medium tabular-nums dark:fill-stone-200">
              {e.v}
              {unit}
            </text>
          </g>
        ))}
      </svg>
      {hover !== null && series.some((s) => s.values[hover] !== null) && (
        <Tooltip x={x(hover)} y={0} width={width}>
          <p className="mb-1 font-semibold">{t('Week of {d}', { d: labels[hover] })}</p>
          {series.map((s) => (
            <p key={s.label} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-0.5 w-3 shrink-0 rounded" style={{ background: s.color }} />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="tabular-nums">{s.values[hover] === null ? '—' : `${s.values[hover]}${unit}`}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  )
}

function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

/** Stacked columns (bottom → top), 4px rounded cap, 2px gap between segments, hover tooltip. */
export function StackedColumns({
  labels,
  series,
  height = 180,
  unit = ' min',
  target,
}: {
  labels: string[]
  series: { label: string; color: string; values: number[] }[]
  height?: number
  unit?: string
  target?: number
}) {
  const t = useT()
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const m = { l: 36, r: 8, t: 14, b: 22 }
  const pw = width - m.l - m.r
  const ph = height - m.t - m.b
  const n = labels.length
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.values[i], 0))
  const rawMax = Math.max(target ?? 0, ...totals, 10)
  const niceStep = rawMax <= 60 ? 15 : rawMax <= 150 ? 30 : rawMax <= 400 ? 100 : 200
  const max = Math.ceil(rawMax / niceStep) * niceStep
  const ticks = Array.from({ length: max / niceStep + 1 }, (_, i) => i * niceStep).filter((_, i, a) => a.length <= 6 || i % 2 === 0)
  const band = pw / n
  const bw = Math.min(24, band * 0.6)
  const y = (v: number) => m.t + ph - (v / max) * ph

  return (
    <div ref={ref} className="relative select-none">
      <svg width={width} height={height} role="img" aria-label={t('Minutes per week')} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="fill-stone-500 text-[11px] tabular-nums dark:fill-stone-400">
              {t}
            </text>
          </g>
        ))}
        {target && <line x1={m.l} x2={width - m.r} y1={y(target)} y2={y(target)} stroke="var(--grid-strong)" strokeWidth={1} strokeDasharray="0" />}
        {labels.map((l, i) => {
          const cx = m.l + band * i + band / 2
          let acc = 0
          const segs = series
            .map((s, k) => {
              const v = s.values[i]
              if (!v) return null
              const y0 = y(acc)
              acc += v
              const y1 = y(acc)
              return { k, y1, h: Math.max(0, y0 - y1 - (acc > v ? 2 : 0)) }
            })
            .filter((s): s is { k: number; y1: number; h: number } => !!s)
          const top = segs[segs.length - 1]
          return (
            <g key={l} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={m.l + band * i} y={m.t} width={band} height={ph} fill="transparent" />
              {segs.map((s) =>
                s === top ? (
                  <path key={s.k} d={topRounded(cx - bw / 2, s.y1, bw, s.h, 4)} fill={series[s.k].color} />
                ) : (
                  <rect key={s.k} x={cx - bw / 2} y={s.y1} width={bw} height={s.h} fill={series[s.k].color} />
                ),
              )}
              {(n - 1 - i) % Math.ceil(n / Math.max(1, Math.floor(pw / 48))) === 0 && (
                <text x={cx} y={height - 6} textAnchor="middle" className="fill-stone-500 text-[11px] dark:fill-stone-400">
                  {l}
                </text>
              )}
              {i === n - 1 && totals[i] > 0 && (
                <text x={cx} y={y(totals[i]) - 4} textAnchor="middle" className="fill-stone-700 text-[11px] font-medium tabular-nums dark:fill-stone-200">
                  {totals[i]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={m.l + band * hover + band / 2} y={0} width={width}>
          <p className="mb-1 font-semibold">{t('Week of {d}', { d: labels[hover] })}</p>
          {series.map((s) => (
            <p key={s.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tabular-nums">
                {s.values[hover]}
                {unit}
              </span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  )
}

/** Thin segmented bar for one whole split into parts (e.g. vocabulary mature / learning / new). */
export function SegmentBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {parts.map((p) =>
          p.value ? <div key={p.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} /> : null,
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="font-medium tabular-nums">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const t = useT()
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-stone-500 select-none dark:text-stone-400">{t('Show as table')}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <thead>
            <tr className="border-b border-stone-200 text-xs text-stone-500 dark:border-stone-700">
              {head.map((h) => (
                <th key={h} className="py-1 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-stone-100 dark:border-stone-800">
                {r.map((c, j) => (
                  <td key={j} className="py-1 pr-3">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
