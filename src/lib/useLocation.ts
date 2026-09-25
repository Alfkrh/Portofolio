/**
 * Router mini berbasis History API.
 *
 * Halaman publik memakai anchor `#section` untuk scroll, sedangkan admin
 * dashboard memakai path (`/admin/...`). Karena itu rute cukup ditentukan oleh
 * `pathname` — tidak perlu dependency router tambahan.
 */

import { useSyncExternalStore } from 'react'

export interface AppLocation {
  pathname: string
  search: string
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('popstate', listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

function readLocation(): AppLocation {
  return { pathname: window.location.pathname, search: window.location.search }
}

let cached: AppLocation = readLocation()

function getSnapshot(): AppLocation {
  const next = readLocation()
  if (next.pathname !== cached.pathname || next.search !== cached.search) {
    cached = next
  }
  return cached
}

const SERVER_LOCATION: AppLocation = { pathname: '/', search: '' }

/** Lokasi saat ini (pathname + query) yang reaktif terhadap back/forward. */
export function useLocation(): AppLocation {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_LOCATION)
}

/** Pindah halaman tanpa reload penuh. */
export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = to.startsWith('/') ? to : `/${to}`
  const current = `${window.location.pathname}${window.location.search}`
  if (target === current) return

  if (options.replace) window.history.replaceState(null, '', target)
  else window.history.pushState(null, '', target)

  emit()
}
