import { ReactNode } from 'react'
import clsx from 'clsx'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-xl transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-400',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-brand-400 text-white hover:bg-brand-600 active:scale-[0.98]': variant === 'primary',
          'bg-white/5 text-gray-700 border border-gray-200 hover:bg-gray-50': variant === 'secondary',
          'text-gray-600 hover:bg-gray-100': variant === 'ghost',
          'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-5 py-2.5 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {loading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('bg-white/5 rounded-2xl border border-gray-100 shadow-sm p-5', className)}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'amber' | 'red' | 'gray' | 'blue'

export function Badge({
  children,
  variant = 'gray',
}: {
  children: ReactNode
  variant?: BadgeVariant
}) {
  return (
    <span
      className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', {
        'bg-green-100 text-green-800': variant === 'green',
        'bg-amber-100 text-amber-800': variant === 'amber',
        'bg-red-100 text-red-800': variant === 'red',
        'bg-gray-100 text-gray-700': variant === 'gray',
        'bg-blue-100 text-blue-800': variant === 'blue',
      })}
    >
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx('animate-spin', className ?? 'h-5 w-5 text-brand-400')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        className={clsx(
          'w-full px-4 py-2.5 rounded-xl border text-sm bg-white/5',
          'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
          'placeholder:text-gray-400',
          error ? 'border-red-400' : 'border-gray-200',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={clsx(
          'w-full px-4 py-2.5 rounded-xl border text-sm bg-white/5 appearance-none',
          'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
          error ? 'border-red-400' : 'border-gray-200',
          className
        )}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={clsx('text-2xl font-bold', accent ?? 'text-gray-900')}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </Card>
  )
}
