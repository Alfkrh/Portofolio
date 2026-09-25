/**
 * Primitive UI admin dashboard — kartu, panel, statistik, dan keadaan kosong.
 * Sengaja memakai token yang sama dengan halaman publik (radius, border,
 * shadow, warna) supaya desainnya konsisten.
 */

import type { ReactNode } from 'react'
import { Check, Info, Plus, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import IconTile from '../../components/ui/IconTile'

type IconTileTone = 'soft' | 'solid' | 'onDark'

interface AdminPanelProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Kartu putih dengan judul opsional — pembungkus utama konten admin. */
export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: AdminPanelProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-card border border-line bg-white shadow-soft',
        className,
      )}
    >
      {title || actions ? (
        <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-display text-base font-bold text-navy">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      <div className={cn('px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
    </section>
  )
}

interface AdminStatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  tone?: IconTileTone
}

/** Kartu statistik untuk halaman Dashboard. */
export function AdminStatCard({
  icon,
  label,
  value,
  hint,
  tone = 'soft',
}: AdminStatCardProps) {
  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-soft transition duration-200 ease-out motion-safe:hover:-translate-y-1 hover:border-brand-200">
      <div className="flex items-center justify-between gap-3">
        <IconTile icon={icon} size="md" tone={tone} />
        <span className="font-display text-3xl font-extrabold tracking-tight text-navy tabular-nums">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-navy">{label}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  )
}

type AdminAlertTone = 'error' | 'info' | 'success'

interface AdminAlertProps {
  tone?: AdminAlertTone
  children: ReactNode
  className?: string
}

const alertTones: Record<AdminAlertTone, { classes: string; icon: LucideIcon }> =
  {
    error: {
      classes: 'border-red-100 bg-red-50 text-red-700',
      icon: TriangleAlert,
    },
    info: { classes: 'border-brand-100 bg-brand-50 text-brand-700', icon: Info },
    success: {
      classes: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      icon: Check,
    },
  }

/** Pesan status ringkas (galat / info / berhasil). */
export function AdminAlert({
  tone = 'info',
  children,
  className,
}: AdminAlertProps) {
  const { classes, icon: Icon } = alertTones[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed',
        classes,
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

interface AdminEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Keadaan kosong saat koleksi belum punya data. */
export function AdminEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-5 py-10 text-center',
        className,
      )}
    >
      <IconTile icon={icon} size="lg" tone="soft" />
      <p className="mt-4 text-sm font-semibold text-navy">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

/** Baris skeleton untuk keadaan loading di dalam panel. */
export function AdminSkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="divide-y divide-line rounded-card border border-line bg-white"
    >
      <span className="sr-only">Memuat data…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 p-5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-line/70 motion-safe:animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-4 w-2/5 rounded bg-line/70 motion-safe:animate-pulse" />
            <div className="h-3 w-3/5 rounded bg-line/70 motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Tombol ikon ringkas (aksi baris daftar). */
export function AdminIconButton({
  icon: Icon,
  label,
  onClick,
  tone = 'neutral',
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  tone?: 'neutral' | 'danger' | 'brand'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-slate-500 transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger' &&
          'hover:border-red-200 hover:bg-red-50 hover:text-red-600',
        tone === 'brand' &&
          'hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
        tone === 'neutral' &&
          'hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  )
}

/** Tombol "+ Tambah" yang dipakai header panel koleksi. */
export function AdminAddButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-pill bg-brand-600 px-4 text-sm font-semibold text-white shadow-soft transition duration-200 ease-out hover:bg-brand-700 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <Plus aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  )
}
