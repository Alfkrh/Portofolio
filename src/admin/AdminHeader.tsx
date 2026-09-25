/**
 * Header admin dashboard: judul halaman, tautan ke situs publik, identitas
 * admin, dan tombol logout.
 */

import { ArrowUpRight, LogOut, Menu } from 'lucide-react'
import { navigate } from '../lib/useLocation'

interface AdminHeaderProps {
  title: string
  description: string
  adminName: string
  initials: string
  /** Email akun admin yang sedang login (baris kedua identitas). */
  email: string | null
  onOpenSidebar: () => void
  onLogout: () => void | Promise<void>
}

export default function AdminHeader({
  title,
  description,
  adminName,
  initials,
  email,
  onOpenSidebar,
  onLogout,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Buka menu"
          aria-controls="admin-sidebar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-navy transition duration-200 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            {title}
          </h1>
          <p className="hidden truncate text-sm text-slate-500 sm:block">
            {description}
          </p>
        </div>

        <a
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
          className="hidden h-10 items-center gap-2 rounded-pill border border-line bg-white px-4 text-sm font-semibold text-navy shadow-soft transition duration-200 ease-out hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 xl:inline-flex"
        >
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          Lihat situs
        </a>

        <div className="flex shrink-0 items-center gap-2 rounded-pill border border-line bg-surface/70 py-1 pr-1 pl-1 sm:pl-3">
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-[10rem] truncate text-sm font-semibold text-navy">
              {adminName}
            </span>
            <span className="block max-w-[14rem] truncate text-[11px] text-slate-400">
              {email ?? 'Administrator'}
            </span>
          </span>

          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-display text-xs font-extrabold text-white"
          >
            {initials || 'AD'}
          </span>

          <button
            type="button"
            onClick={() => void onLogout()}
            title="Keluar"
            aria-label="Keluar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-slate-500 transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
