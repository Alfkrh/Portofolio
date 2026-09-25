import type { Contact } from '../types/portfolio'
import SocialIcon from './ui/SocialIcon'
import { cn } from '../lib/cn'

interface SocialLinksProps {
  contacts: Contact[]
  /** Tampilkan label di samping ikon (dipakai di footer). */
  showLabels?: boolean
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * Baris ikon sosial. Kontak yang belum punya URL tampil nonaktif dengan
 * tooltip, sehingga tidak pernah ada tautan palsu.
 */
export default function SocialLinks({
  contacts,
  showLabels = false,
  tone = 'light',
  className,
}: SocialLinksProps) {
  if (contacts.length === 0) return null

  return (
    <ul className={cn('flex flex-wrap items-center gap-2.5', className)}>
      {contacts.map((contact) => {
        const isDark = tone === 'dark'
        const label = contact.label ?? contact.kind

        const baseClasses = cn(
          'inline-flex items-center gap-2 rounded-pill border text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
          showLabels ? 'h-10 px-3.5' : 'h-11 w-11 justify-center',
          isDark
            ? 'border-white/15 text-slate-200 hover:border-white/30 hover:bg-white/10'
            : 'border-line bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
        )

        if (!contact.url) {
          return (
            <li key={contact.id}>
              <span
                title={`${label} — tautan belum ditambahkan`}
                className={cn(
                  baseClasses,
                  'cursor-not-allowed border-dashed opacity-60',
                )}
              >
                <SocialIcon kind={contact.kind} className="h-4 w-4" />
                <span className={cn(!showLabels && 'sr-only')}>{label}</span>
              </span>
            </li>
          )
        }

        const isExternal = contact.url.startsWith('http')

        return (
          <li key={contact.id}>
            <a
              href={contact.url}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noreferrer' : undefined}
              className={cn(baseClasses, 'motion-safe:hover:-translate-y-0.5')}
            >
              <SocialIcon kind={contact.kind} className="h-4 w-4" />
              <span className={cn(!showLabels && 'sr-only')}>
                {contact.value ?? label}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
