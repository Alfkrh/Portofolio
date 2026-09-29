import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { cn } from '../lib/cn'

/**
 * Tombol ganti tema di Navbar.
 *
 * - Light Mode menampilkan ikon Moon (tooltip "Dark Mode").
 * - Dark Mode menampilkan ikon Sun (tooltip "Light Mode").
 * - Pilihan disimpan di localStorage sehingga bertahan setelah refresh.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme()

  const label = isDark ? 'Light Mode' : 'Dark Mode'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={cn(
        'group inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-navy shadow-soft transition duration-300 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-400/50 dark:hover:bg-slate-700 dark:hover:text-brand-300 dark:focus-visible:ring-offset-slate-900',
        className,
      )}
    >
      <span className="relative block h-5 w-5" aria-hidden="true">
        <Moon
          className={cn(
            'absolute inset-0 h-5 w-5 transition duration-300 ease-out',
            isDark
              ? 'rotate-90 scale-50 opacity-0'
              : 'rotate-0 scale-100 opacity-100',
          )}
        />
        <Sun
          className={cn(
            'absolute inset-0 h-5 w-5 transition duration-300 ease-out',
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-50 opacity-0',
          )}
        />
      </span>
      <span className="sr-only">{label}</span>
    </button>
  )
}
