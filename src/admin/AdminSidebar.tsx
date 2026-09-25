/**
 * Sidebar admin dashboard.
 *
 * Desktop: kolom tetap (navy) di sisi kiri. Mobile/tablet: drawer dengan
 * overlay yang bisa ditutup lewat tombol, Escape, atau setelah memilih menu.
 */

import { useEffect } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { navigate } from '../lib/useLocation'
import { cn } from '../lib/cn'
import type { AdminNavItem } from './adminConfig'

interface SidebarContentProps {
  items: AdminNavItem[]
  activePath: string
  onNavigate: () => void
}

function SidebarContent({ items, activePath, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 font-display text-sm font-extrabold text-white shadow-soft">
          AF
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-extrabold text-white">
            Portfolio Admin
          </span>
          <span className="block truncate text-[11px] text-slate-400">
            Kelola konten website
          </span>
        </span>
      </div>

      <nav aria-label="Menu admin" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = item.path === activePath
            const Icon = item.icon

            return (
              <li key={item.id}>
                <a
                  href={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(item.path)
                    onNavigate()
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-navy',
                    isActive
                      ? 'bg-brand-600 text-white shadow-soft'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'text-white' : 'text-brand-300',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
            onNavigate()
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition duration-200 ease-out hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        >
          <ArrowUpRight aria-hidden="true" className="h-[18px] w-[18px] text-brand-300" />
          Lihat situs publik
        </a>
      </div>
    </div>
  )
}

interface AdminSidebarProps {
  items: AdminNavItem[]
  activePath: string
  open: boolean
  onClose: () => void
}

export default function AdminSidebar({
  items,
  activePath,
  open,
  onClose,
}: AdminSidebarProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <>
      {/* Sidebar tetap untuk desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-white/10 bg-navy lg:flex">
        <SidebarContent
          items={items}
          activePath={activePath}
          onNavigate={onClose}
        />
      </aside>

      {/* Drawer untuk mobile & tablet */}
      {open ? (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
          />

          <div
            id="admin-sidebar"
            className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-navy shadow-lift"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu"
              className="absolute top-4 right-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>

            <SidebarContent
              items={items}
              activePath={activePath}
              onNavigate={onClose}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
