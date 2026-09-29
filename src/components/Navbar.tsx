import { useEffect, useMemo, useState } from 'react'
import { Menu, X } from 'lucide-react'
import type { SectionId } from '../types/portfolio'
import { useActiveSection } from '../hooks/useActiveSection'
import { useScrolled } from '../hooks/useScrolled'
import { anchors } from '../config/siteCopy'
import Button from './ui/Button'
import Container from './ui/Container'
import LogoMark from './LogoMark'
import ThemeToggle from './ThemeToggle'
import { cn } from '../lib/cn'

interface NavItem {
  id: SectionId
  label: string
}

interface NavbarProps {
  items: NavItem[]
  /** Wordmark dari database, mis. "ALIF.". */
  logo: string | null
  name: string
  ctaLabel: string
  /** Logo yang diunggah dari Settings; `null` = pakai mark bawaan. */
  markUrl?: string | null
}

export default function Navbar({
  items,
  logo,
  name,
  ctaLabel,
  markUrl = null,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const scrolled = useScrolled(12)

  const sectionIds = useMemo(() => items.map((item) => item.id), [items])
  const activeId = useActiveSection(sectionIds)

  // Tutup menu mobile dengan Escape dan saat keluar dari breakpoint mobile.
  useEffect(() => {
    if (!isMenuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    const onResize = () => {
      if (window.innerWidth >= 1024) setIsMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [isMenuOpen])

  const rawLogo = (logo?.trim() || name).replace(/\.$/, '')

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition duration-300 ease-out',
        scrolled || isMenuOpen
          ? 'border-b border-line/80 bg-white/85 shadow-soft backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90'
          : 'border-b border-transparent bg-white/60 backdrop-blur-sm dark:bg-slate-900/60',
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <a
            href="#home"
            onClick={() => setIsMenuOpen(false)}
            className="inline-flex items-center gap-2.5 rounded-sm font-display text-xl font-extrabold tracking-tight text-navy transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-4 dark:text-slate-50 dark:hover:text-brand-400 dark:focus-visible:ring-offset-slate-900"
          >
            {/* Ukuran bawaan mark: 32px — sama tinggi dengan baris navbar. */}
            <LogoMark src={markUrl} />
            <span>
              {rawLogo}
              <span className="text-brand-600 dark:text-brand-400">.</span>
            </span>
            <span className="sr-only"> — {name}</span>
          </a>

          <nav aria-label="Navigasi utama" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => {
                const isActive = activeId === item.id

                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'relative rounded-pill px-3.5 py-2 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
                        isActive
                          ? 'text-brand-700 dark:text-brand-400'
                          : 'text-slate-600 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-400',
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute inset-x-3.5 -bottom-px h-0.5 rounded-pill bg-brand-600 transition duration-300 ease-out dark:bg-brand-400',
                          isActive
                            ? 'scale-x-100 opacity-100'
                            : 'scale-x-0 opacity-0',
                        )}
                      />
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {/* Ganti Light / Dark Mode — pilihan disimpan di localStorage. */}
            <ThemeToggle />

            <Button
              href={anchors.contact}
              size="sm"
              /* `hidden sm:inline-flex` tidak bekerja di Tailwind v4 karena
                 `.hidden` di-emit sebelum `.inline-flex`. */
              className="max-sm:hidden"
              variant="primary"
            >
              {ctaLabel}
            </Button>

            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-navy transition duration-200 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-400/50 dark:hover:bg-slate-700 dark:hover:text-brand-300 dark:focus-visible:ring-offset-slate-900 lg:hidden"
            >
              {isMenuOpen ? (
                <X aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Menu aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Menu mobile */}
      <div
        id="mobile-menu"
        hidden={!isMenuOpen}
        className="border-t border-line bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900 lg:hidden"
      >
        <Container className="py-4">
          <nav aria-label="Navigasi mobile">
            <ul className="flex flex-col gap-1">
              {items.map((item) => {
                const isActive = activeId === item.id

                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        'block rounded-xl px-3.5 py-3 text-sm font-medium transition duration-200',
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-400'
                          : 'text-slate-600 hover:bg-surface hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-400',
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>

          <Button
            href={anchors.contact}
            onClick={() => setIsMenuOpen(false)}
            fullWidth
            className="mt-4"
          >
            {ctaLabel}
          </Button>
        </Container>
      </div>
    </header>
  )
}
