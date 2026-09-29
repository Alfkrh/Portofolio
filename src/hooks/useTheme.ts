/** Hook tema halaman publik: membaca snapshot store + aksi ganti mode. */

import { useCallback, useSyncExternalStore } from 'react'
import {
  getThemeSnapshot,
  setThemePreference,
  subscribeTheme,
  toggleTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../services/themeStore'

const getServerSnapshot = getThemeSnapshot

export interface UseThemeResult {
  /** Mode yang sedang dipakai (hasil gabungan preferensi + sistem). */
  theme: ResolvedTheme
  isDark: boolean
  /** Preferensi tersimpan user: `light` | `dark` | `system`. */
  preference: ThemePreference
  /** Ganti Light ↔ Dark dan simpan sebagai pilihan manual. */
  toggle: () => void
  setPreference: (preference: ThemePreference) => void
}

export function useTheme(): UseThemeResult {
  const snapshot = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerSnapshot,
  )

  const toggle = useCallback(() => toggleTheme(), [])
  const setPreference = useCallback(
    (preference: ThemePreference) => setThemePreference(preference),
    [],
  )

  return {
    theme: snapshot.theme,
    isDark: snapshot.theme === 'dark',
    preference: snapshot.preference,
    toggle,
    setPreference,
  }
}
