/**
 * Store tema halaman publik (Light / Dark Mode).
 *
 * Aturan prioritas:
 * 1. Pilihan manual user disimpan di `localStorage` (`portfolio-theme`) —
 *    paling tinggi, bertahan setelah refresh / tab baru.
 * 2. Belum pernah memilih → ikut preferensi sistem (`prefers-color-scheme`).
 * 3. Sistem tidak tersedia → Light Mode (default aman).
 *
 * Class `.dark` dipasang di `<html>` sehingga seluruh komponen memakai
 * varian `dark:` dari Tailwind. Dashboard `/admin` sengaja TIDAK memakai
 * tema gelap (tetap desain lamanya), jadi `.dark` hanya dipasang selama
 * halaman publik yang aktif.
 */

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeSnapshot {
  preference: ThemePreference
  theme: ResolvedTheme
}

/** Key penyimpanan; sama dengan skrip anti-flash di `index.html`. */
export const THEME_STORAGE_KEY = 'portfolio-theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#2563EB',
  dark: '#0F172A',
}

const listeners = new Set<() => void>()

/** Baca preferensi tersimpan; nilai tak dikenal dianggap `system`. */
export function readPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage tidak tersedia (mode privat) → pakai default.
  }
  return 'system'
}

/** Preferensi sistem; `light` bila media query tidak didukung. */
function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference
}

/** Dark Mode hanya dipakai di halaman publik, bukan di dashboard admin. */
function isPublicPage(): boolean {
  if (typeof window === 'undefined') return true
  const { pathname } = window.location
  return pathname !== '/admin' && !pathname.startsWith('/admin/')
}

function createSnapshot(): ThemeSnapshot {
  const preference = readPreference()
  return { preference, theme: resolveTheme(preference) }
}

/**
 * Snapshot tersimpan (di-cache supaya `useSyncExternalStore` tidak
 * melakukan render ulang tanpa henti).
 */
let snapshot: ThemeSnapshot = createSnapshot()

/** Terapkan tema sesuai preferensi tersimpan DAN rute yang sedang aktif. */
export function syncTheme(): void {
  if (typeof document === 'undefined') return

  snapshot = createSnapshot()

  const root = document.documentElement
  const useDark = isPublicPage() && snapshot.theme === 'dark'

  root.classList.toggle('dark', useDark)
  root.style.colorScheme = useDark ? 'dark' : 'light'

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEME_COLOR[useDark ? 'dark' : 'light'])
  }
}

export function getThemeSnapshot(): ThemeSnapshot {
  return snapshot
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  syncTheme()
  for (const listener of listeners) listener()
}

/** Simpan preferensi lalu terapkan ke dokumen. */
export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Mode privat: preferensi tetap berlaku selama sesi lewat snapshot.
  }
  emit()
}

/** Ganti antara Light ↔ Dark (disimpan sebagai pilihan manual). */
export function toggleTheme(): void {
  setThemePreference(snapshot.theme === 'dark' ? 'light' : 'dark')
}

/**
 * Ikuti perubahan `prefers-color-scheme` selama user memakai mode `system`,
 * supaya tema menyesuaikan tanpa refresh.
 */
function watchSystemTheme(): void {
  if (typeof window === 'undefined' || !window.matchMedia) return

  let query: MediaQueryList
  try {
    query = window.matchMedia(DARK_QUERY)
  } catch {
    return
  }

  const onChange = () => {
    if (readPreference() === 'system') emit()
  }

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange)
  } else {
    // Safari lama.
    query.addListener(onChange)
  }
}

/** Pasang tema sesegera mungkin saat aplikasi dimuat. */
export function initTheme(): void {
  syncTheme()
  watchSystemTheme()
}
