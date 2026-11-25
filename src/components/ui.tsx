import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white',
  secondary:
    'bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-100 dark:border-stone-700 dark:hover:bg-stone-800',
  ghost: 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ComponentPropsWithRef<'button'> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: IconName }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none select-none',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5 text-[15px]',
        size === 'lg' && 'px-5 py-3.5 text-base w-full',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} className={size === 'sm' ? 'size-4' : 'size-5'} />}
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900', className)}>
      {children}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-sm text-stone-500 dark:text-stone-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700',
        )}
      >
        <span
          className={cx('absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')}
        />
      </button>
    </label>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
        checked
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-stone-300 text-transparent hover:border-stone-400 dark:border-stone-600',
      )}
    >
      <Icon name="check" className="size-4" strokeWidth={3} />
    </button>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800', className)}>
      <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}

export function Chip({ children, tone = 'stone', className }: { children: ReactNode; tone?: 'stone' | 'green' | 'amber' | 'rose' | 'sky'; className?: string }) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

export function PageHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3 pt-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{sub}</p>}
      </div>
      {right}
    </header>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between">
      <h2 className="text-xs font-semibold tracking-wider text-stone-500 uppercase dark:text-stone-400">{children}</h2>
      {right}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-white shadow-sm dark:bg-stone-950' : 'text-stone-500 dark:text-stone-400',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const inputCls =
  'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-[17px] outline-none placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-950 dark:focus:border-stone-400 dark:focus:ring-stone-800'

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">{children}</p>
}
